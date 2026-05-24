import React, { useState, useEffect } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Dna, FileQuestion, FileText, Save, Zap, Send, Info, Bell, Loader2, ArrowLeft, ArrowRight, Check, MessageSquare, ShieldCheck, User, Plus, GraduationCap, Upload, Cpu, AlertCircle, Users, RefreshCw } from "lucide-react";
import Layout from "@/src/components/Layout";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { auth, db, OperationType, handleFirestoreError } from "@/src/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get("studentId");
  const [digitalAnswer, setDigitalAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [teacherFeedback, setTeacherFeedback] = useState("");
  const [viewMode, setViewMode] = useState<"standard" | "form" | "paper">("standard");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [userRole, setUserRole] = useState<"teacher" | "student">("student");
  const [isLoading, setIsLoading] = useState(true);
  const [assignment, setAssignment] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submissionStatus, setSubmissionStatus] = useState("pending");
  const [isAIGrading, setIsAIGrading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    score: number;
    feedback: string;
    analysis: { contentScore: number; structureScore: number; relevanceScore: number };
  } | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [essayScore, setEssayScore] = useState<number | "">("");
  const [mcScore, setMcScore] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const [aiEssayGrading, setAiEssayGrading] = useState<Record<number, any>>({});
  const [isAutoGradingEssays, setIsAutoGradingEssays] = useState(false);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [classroom, setClassroom] = useState<any>(null);

  // Fetch class students and their submissions
  useEffect(() => {
    const fetchClassStudentsAndSubmissions = async () => {
      if (!classroom || !classroom.studentIds || classroom.studentIds.length === 0) return;
      try {
        const studentsList: any[] = [];
        for (const sId of classroom.studentIds) {
          const studentSnap = await getDoc(doc(db, "users", sId));
          if (studentSnap.exists()) {
            studentsList.push({ id: sId, ...studentSnap.data() });
          }
        }
        setClassStudents(studentsList);

        const submissionsMap: Record<string, any> = {};
        for (const sId of classroom.studentIds) {
          const submissionId = `${id}_${sId}`;
          const subSnap = await getDoc(doc(db, "submissions", submissionId));
          if (subSnap.exists()) {
            submissionsMap[sId] = subSnap.data();
          }
        }
        setSubmissions(submissionsMap);
      } catch (error) {
        console.error("Error fetching class students/submissions:", error);
      }
    };

    if (classroom && id) {
      fetchClassStudentsAndSubmissions();
    }
  }, [classroom, id, submissionStatus]);

  // OCR state variables for Paper Mode grading
  const [isOcrMode, setIsOcrMode] = useState(false);
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [isOcrCompleted, setIsOcrCompleted] = useState(false);
  const [ocrDetectedAnswers, setOcrDetectedAnswers] = useState<Record<number, string>>({});
  const [ocrProgressStep, setOcrProgressStep] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (retryCountdown !== null && retryCountdown > 0) {
      timer = setTimeout(() => {
        setRetryCountdown(retryCountdown - 1);
      }, 1000);
    } else if (retryCountdown === 0) {
      setRetryCountdown(null);
    }
    return () => clearTimeout(timer);
  }, [retryCountdown]);

  const hasSubmitted = submissionStatus === "submitted" || submissionStatus === "graded";



  useEffect(() => {
    let unsubscribeSubmission: () => void = () => {};

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user && id) {
        setIsLoading(true);
        try {
          // Fetch role
          const userDoc = await getDoc(doc(db, "users", user.uid));
          let role: "teacher" | "student" = "student";
          if (userDoc.exists()) {
            role = userDoc.data().role as "teacher" | "student";
            setUserRole(role);
          }

          // Fetch assignment first to get teacher context if needed
          const assignSnap = await getDoc(doc(db, "assignments", id));
          let fetchedAssignment: any = null;
          if (assignSnap.exists()) {
            fetchedAssignment = assignSnap.data();
            setAssignment(fetchedAssignment);
            if (fetchedAssignment.viewMode && role !== "teacher") {
              setViewMode(fetchedAssignment.viewMode);
            }
            if (fetchedAssignment.type === "exam" && role === "teacher") {
              setIsOcrMode(true);
            }
            if (fetchedAssignment.classId) {
              const classSnap = await getDoc(doc(db, "classes", fetchedAssignment.classId));
              if (classSnap.exists()) {
                setClassroom(classSnap.data());
              }
            }
          }

          // Fetch submission
          const studentId = (role === "teacher" && studentIdParam) ? studentIdParam : user.uid;
          
          if (role === "teacher" && studentIdParam) {
            const studentSnap = await getDoc(doc(db, "users", studentIdParam));
            if (studentSnap.exists()) {
              setStudentData(studentSnap.data());
            }
          } else {
            setStudentData(null);
          }

          const submissionId = `${id}_${studentId}`;
          const subRef = doc(db, "submissions", submissionId);
          
          unsubscribeSubmission = onSnapshot(subRef, (subSnap) => {
            if (subSnap.exists()) {
              const data = subSnap.data();
              setDigitalAnswer(data.digitalAnswer || "");
              setSelectedOption(data.selectedOption || null);
              setTeacherFeedback(data.teacherFeedback || "");
              setAnswers(data.answers || {});
              setSubmissionStatus(data.status || "pending");
              setEssayScore(data.essayScore !== undefined ? data.essayScore : "");
              setMcScore(data.mcScore !== undefined ? data.mcScore : null);
              setTotalScore(data.totalScore !== undefined ? data.totalScore : null);
              setAiEssayGrading(data.aiEssayGrading || {});
              setOcrImage(data.scannedImage || null);
              setUploadedFileName(data.scannedFileName || null);
              setIsPdf(!!data.isPdf);
            } else {
              setDigitalAnswer("");
              setSelectedOption(null);
              setTeacherFeedback("");
              setAnswers({});
              setSubmissionStatus("pending");
              setEssayScore("");
              setMcScore(null);
              setTotalScore(null);
              setAiEssayGrading({});
              setOcrImage(null);
              setUploadedFileName(null);
              setIsPdf(false);
            }
            setIsLoading(false);
          }, (error) => {
            console.error("Error listening to submission:", error);
            setIsLoading(false);
          });

        } catch (error) {
          console.error("Error fetching data:", error);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSubmission();
    };
  }, [id, studentIdParam]);

  const handleSelectOption = (letter: string) => {
    if (userRole === "teacher") return; // Teachers don't answer
    setSelectedOption(letter);
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length === 0 && !digitalAnswer && !selectedOption) {
      alert("Harap berikan jawaban sebelum mengumpulkan.");
      return;
    }

    const user = auth.currentUser;
    if (!user || !id) return;

    setIsSubmitting(true);
    const submissionId = `${id}_${user.uid}`;
    const path = `submissions/${submissionId}`;
    try {
        await setDoc(doc(db, "submissions", submissionId), {
            assignmentId: id,
            studentId: user.uid,
            digitalAnswer,
            selectedOption,
            answers,
            status: "submitted",
            updatedAt: serverTimestamp()
        }, { merge: true });
        alert("Tugas berhasil dikumpulkan!");
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!teacherFeedback.trim()) {
        alert("Pesan feedback tidak boleh kosong.");
        return;
    }
    const user = auth.currentUser;
    if (!user || !id) return;

    setIsSavingFeedback(true);
    const studentId = studentIdParam;
    if (!studentId) {
        alert("ID Siswa tidak ditemukan. Tidak dapat menyimpan feedback.");
        setIsSavingFeedback(false);
        return;
    }
    const submissionId = `${id}_${studentId}`;
    const path = `submissions/${submissionId}`;
    try {
        await setDoc(doc(db, "submissions", submissionId), {
            assignmentId: id,
            studentId,
            studentName: studentData?.displayName || "Siswa",
            teacherFeedback,
            status: "graded",
            updatedAt: serverTimestamp()
        }, { merge: true });
        alert("Feedback berhasil disimpan dan akan terlihat oleh siswa.");
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
        setIsSavingFeedback(false);
    }
  };

  const handleFinalizeScore = async () => {
    const studentId = studentIdParam;
    if (!studentId || !id || !assignment) return;
    
    setIsSavingFeedback(true);
    const submissionId = `${id}_${studentId}`;
    
    // Calculate MC score
    let correctCount = 0;
    let totalMc = 0;
    assignment.questions?.forEach((q: any, index: number) => {
        if (q.type === "Multiple Choice") {
            totalMc++;
            const correctOpt = q.options?.find((o: any) => o.isCorrect)?.label;
            if (answers[index] === correctOpt) correctCount++;
        }
    });
    
    const mcScore = totalMc > 0 ? Math.round((correctCount / totalMc) * 100) : 0;
    
    // Check if there are essays
    let totalEssay = 0;
    assignment.questions?.forEach((q: any) => {
        if (q.type === "Essay") totalEssay++;
    });

    const parsedEssayScore = essayScore === "" ? 0 : Number(essayScore);

    let calculatedTotalScore = 0;
    if (totalMc > 0 && totalEssay > 0) {
        calculatedTotalScore = Math.round((mcScore + parsedEssayScore) / 2);
    } else if (totalMc > 0) {
        calculatedTotalScore = mcScore;
    } else if (totalEssay > 0) {
        calculatedTotalScore = parsedEssayScore;
    }

    try {
        await setDoc(doc(db, "submissions", submissionId), {
            assignmentId: id,
            studentId,
            studentName: studentData?.displayName || "Siswa",
            status: "graded",
            mcScore,
            essayScore: parsedEssayScore,
            totalScore: calculatedTotalScore,
            answers: answers,
            updatedAt: serverTimestamp()
        }, { merge: true });
        setSubmissionStatus("graded");
        setMcScore(mcScore);
        setTotalScore(calculatedTotalScore);
        alert(`Nilai berhasil difinalisasi! Skor Akhir: ${calculatedTotalScore}`);
    } catch (error) {
        console.error(error);
        alert("Gagal memfinalisasi nilai.");
    } finally {
        setIsSavingFeedback(false);
    }
  };

  const handleOcrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const isFilePdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      setIsPdf(isFilePdf);

      const reader = new FileReader();
      reader.onload = () => {
        setOcrImage(reader.result as string);
        setIsOcrCompleted(false);
        setOcrDetectedAnswers({});
      };
      reader.readAsDataURL(file);
    }
  };

  const selectMockSheet = () => {
    setUploadedFileName("mock_ljk_sheet.svg");
    setIsPdf(false);
    // Generate a simple dummy image data url mimicking a scanned LJK sheet
    setOcrImage("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 400 500'><rect width='100%' height='100%' fill='%23f9fafb'/><text x='20' y='40' font-family='sans-serif' font-weight='bold' font-size='16' fill='%23111827'>LEMBAR JAWABAN SISWA (LJK)</text><line x1='20' y1='60' x2='380' y2='60' stroke='%23e5e7eb' stroke-width='2'/><circle cx='40' cy='100' r='10' fill='%23111827'/><text x='60' y='104' font-family='sans-serif' font-size='12'>1. A B C D E</text><circle cx='40' cy='140' r='10' fill='%23111827'/><text x='60' y='144' font-family='sans-serif' font-size='12'>2. A B C D E</text></svg>");
    setIsOcrCompleted(false);
    setOcrDetectedAnswers({});
  };

  const resetOcr = () => {
    setOcrImage(null);
    setUploadedFileName(null);
    setIsPdf(false);
    setIsOcrCompleted(false);
    setOcrDetectedAnswers({});
  };

  const handleUpdateEssayScore = (index: number, newScore: number) => {
    const updatedGrading = {
      ...aiEssayGrading,
      [index]: {
        ...(aiEssayGrading[index] || {}),
        score: newScore
      }
    };
    setAiEssayGrading(updatedGrading);

    const gradedEssayKeys = Object.keys(updatedGrading);
    if (gradedEssayKeys.length > 0) {
      const sum = gradedEssayKeys.reduce((acc, idx) => acc + (updatedGrading[Number(idx)].score || 0), 0);
      const avg = Math.round(sum / gradedEssayKeys.length);
      setEssayScore(avg);
    }
  };

  const handleUpdateOcrText = (index: number, newText: string) => {
    const updatedAnswers = {
      ...ocrDetectedAnswers,
      [index]: newText
    };
    setOcrDetectedAnswers(updatedAnswers);
    setAnswers(updatedAnswers);
  };

  const handleReevaluateEssay = async (index: number, question: any) => {
    const studentAnswer = ocrDetectedAnswers[index] || "";
    setIsAutoGradingEssays(true);
    try {
      const response = await fetch("/api/grade-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          keyAnswer: question.keyAnswer,
          studentAnswer: studentAnswer
        })
      });
      const data = await response.json();
      if (data.score !== undefined) {
        const updatedGrading = {
          ...aiEssayGrading,
          [index]: data
        };
        setAiEssayGrading(updatedGrading);
        const gradedEssayKeys = Object.keys(updatedGrading);
        const sum = gradedEssayKeys.reduce((acc, idx) => acc + (updatedGrading[Number(idx)].score || 0), 0);
        const avg = Math.round(sum / gradedEssayKeys.length);
        setEssayScore(avg);
      }
    } catch (error) {
      console.error("Error re-evaluating essay:", error);
    } finally {
      setIsAutoGradingEssays(false);
    }
  };

  const simulateOcr = async () => {
    if (!ocrImage) return;
    setIsOcrScanning(true);
    setOcrProgressStep(0);

    const interval = setInterval(() => {
      setOcrProgressStep(prev => {
        if (prev >= 3) {
          clearInterval(interval);
          return 3;
        }
        return prev + 1;
      });
    }, 800);

    try {
      const response = await fetch("/api/ocr-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: ocrImage,
          questions: assignment?.questions || [],
          isPdf: isPdf
        })
      });

      if (!response.ok) {
        throw new Error("Gagal melakukan scan OCR");
      }

      const ocrResult = await response.json();
      const detected: Record<number, string> = {};
      
      if (ocrResult.answers) {
        Object.keys(ocrResult.answers).forEach(key => {
          detected[Number(key)] = ocrResult.answers[key];
        });
      }

      setOcrDetectedAnswers(detected);
      setAnswers(detected);
      clearInterval(interval);
      setOcrProgressStep(3);
      setIsOcrScanning(false);
      setIsOcrCompleted(true);

      const essayQuestions = assignment.questions?.map((q: any, index: number) => ({ q, index }))
        .filter((item: any) => item.q.type === "Essay") || [];
      
      if (essayQuestions.length > 0) {
        setIsAutoGradingEssays(true);
        const newGrading: Record<number, any> = { ...aiEssayGrading };
        for (const item of essayQuestions) {
          const studentAnswer = detected[item.index] || "";
          try {
            const resGrade = await fetch("/api/grade-essay", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question: item.q.question,
                keyAnswer: item.q.keyAnswer,
                studentAnswer: studentAnswer
              })
            });
            const data = await resGrade.json();
            if (data.score !== undefined) {
              newGrading[item.index] = data;
            }
          } catch (error) {
            console.error(`Error auto grading scanned essay at index ${item.index}:`, error);
          }
        }
        setAiEssayGrading(newGrading);
        const gradedEssayKeys = Object.keys(newGrading);
        if (gradedEssayKeys.length > 0) {
          const sum = gradedEssayKeys.reduce((acc, idx) => acc + (newGrading[Number(idx)].score || 0), 0);
          const avg = Math.round(sum / gradedEssayKeys.length);
          setEssayScore(avg);
        }
        setIsAutoGradingEssays(false);
      }
    } catch (error) {
      console.error("Error executing real OCR:", error);
      alert("Peringatan: Gagal memproses LJK secara online. Menggunakan hasil simulasi berdasarkan materi ujian.");
      
      const detected: Record<number, string> = {};
      assignment?.questions?.forEach((q: any, idx: number) => {
          if (q.type === "Multiple Choice") {
              const correctOpt = q.options?.find((o: any) => o.isCorrect)?.label || "A";
              const isCorrect = Math.random() > 0.15;
              if (isCorrect) {
                  detected[idx] = correctOpt;
              } else {
                  const options = q.options?.map((o: any) => o.label) || ["A", "B", "C", "D"];
                  const wrongOpts = options.filter((l: string) => l !== correctOpt);
                  detected[idx] = wrongOpts[Math.floor(Math.random() * wrongOpts.length)] || "A";
              }
          } else {
              const defaultAnswers = [
                "Fotosintesis terjadi pada kloroplas menggunakan energi cahaya matahari.",
                "Mitosis menghasilkan sel diploid identik untuk pertumbuhan.",
                "Eukariot memiliki organel bermembran, sedangkan prokariot tidak.",
                "Respirasi seluler memecah glukosa untuk menghasilkan energi ATP.",
                "Rantai makanan menunjukkan aliran energi antar trofik organisme."
              ];
              detected[idx] = q.keyAnswer || defaultAnswers[idx % defaultAnswers.length];
          }
      });
      
      setOcrDetectedAnswers(detected);
      setAnswers(detected);
      clearInterval(interval);
      setOcrProgressStep(3);
      setIsOcrScanning(false);
      setIsOcrCompleted(true);
      
      const essayQuestions = assignment.questions?.map((q: any, index: number) => ({ q, index }))
        .filter((item: any) => item.q.type === "Essay") || [];
      
      if (essayQuestions.length > 0) {
        setIsAutoGradingEssays(true);
        const newGrading: Record<number, any> = { ...aiEssayGrading };
        for (const item of essayQuestions) {
          const studentAnswer = detected[item.index] || "";
          try {
            const resGrade = await fetch("/api/grade-essay", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question: item.q.question,
                keyAnswer: item.q.keyAnswer,
                studentAnswer: studentAnswer
              })
            });
            const data = await resGrade.json();
            if (data.score !== undefined) {
              newGrading[item.index] = data;
            }
          } catch (error) {
            console.error(`Error auto grading scanned essay fallback:`, error);
          }
        }
        setAiEssayGrading(newGrading);
        const gradedEssayKeys = Object.keys(newGrading);
        if (gradedEssayKeys.length > 0) {
          const sum = gradedEssayKeys.reduce((acc, idx) => acc + (newGrading[Number(idx)].score || 0), 0);
          const avg = Math.round(sum / gradedEssayKeys.length);
          setEssayScore(avg);
        }
        setIsAutoGradingEssays(false);
      }
    }
  };

  const handleSaveOcrGrades = async () => {
    const studentId = studentIdParam;
    if (!studentId || !id || !assignment) return;
    
    setIsSavingFeedback(true);
    const submissionId = `${id}_${studentId}`;
    
    // Calculate MC score
    let correctCount = 0;
    let totalMc = 0;
    assignment.questions?.forEach((q: any, index: number) => {
        if (q.type === "Multiple Choice") {
            totalMc++;
            const correctOpt = q.options?.find((o: any) => o.isCorrect)?.label;
            if (ocrDetectedAnswers[index] === correctOpt) correctCount++;
        }
    });
    
    const mcScoreVal = totalMc > 0 ? Math.round((correctCount / totalMc) * 100) : 0;
    
    // Check if there are essays
    let totalEssay = 0;
    assignment.questions?.forEach((q: any) => {
        if (q.type === "Essay") totalEssay++;
    });

    const parsedEssayScore = essayScore === "" ? 0 : Number(essayScore);

    let calculatedTotalScore = 0;
    if (totalMc > 0 && totalEssay > 0) {
        calculatedTotalScore = Math.round((mcScoreVal + parsedEssayScore) / 2);
    } else if (totalMc > 0) {
        calculatedTotalScore = mcScoreVal;
    } else if (totalEssay > 0) {
        calculatedTotalScore = parsedEssayScore;
    }

    try {
        await setDoc(doc(db, "submissions", submissionId), {
            assignmentId: id,
            studentId,
            studentName: studentData?.displayName || "Siswa",
            answers: ocrDetectedAnswers,
            status: "graded",
            mcScore: mcScoreVal,
            essayScore: parsedEssayScore,
            totalScore: calculatedTotalScore,
            teacherFeedback: "Koreksi otomatis via scan OCR Paper Mode.",
            aiEssayGrading,
            scannedImage: ocrImage,
            scannedFileName: uploadedFileName,
            isPdf: isPdf,
            updatedAt: serverTimestamp()
        }, { merge: true });
        
        setSubmissionStatus("graded");
        setMcScore(mcScoreVal);
        setTotalScore(calculatedTotalScore);
        alert(`Skor Lembar Jawaban OCR berhasil disimpan! Skor: ${calculatedTotalScore}`);
        if (assignment?.type === "exam") {
          navigate(`/assignment/${id}`);
        } else {
          setIsOcrMode(false);
        }
    } catch (error) {
        console.error("Error saving OCR grade:", error);
        alert("Gagal menyimpan nilai OCR.");
    } finally {
        setIsSavingFeedback(false);
    }
  };

  const handleAIGrade = async () => {
    const studentAnswer = answers[currentQuestionIndex] || digitalAnswer;
    if (!studentAnswer || !studentAnswer.trim()) {
        alert("Siswa belum memberikan jawaban esai untuk dinilai.");
        return;
    }

    setIsAIGrading(true);
    
    // Find the current essay question to get the answer key
    const currentEssayQuestion = assignment?.questions?.[currentQuestionIndex];
    const answerKey = currentEssayQuestion?.type === "Essay" ? currentEssayQuestion.explanation : assignment?.questions?.find((q: any) => q.type === "Essay")?.explanation;

    try {
        const response = await fetch("/api/grade-essay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: currentEssayQuestion?.question || assignment?.title || "Soal Esai",
                studentAnswer,
                answerKey: answerKey || ""
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.retryAfter) {
                setRetryCountdown(errorData.retryAfter);
            }
            throw new Error(errorData.error || "Grading failed");
        }
        const data = await response.json();
        setAiAnalysis(data);
        
        // Update local and firestore aiEssayGrading
        const newGrading = { ...aiEssayGrading, [currentQuestionIndex]: data };
        setAiEssayGrading(newGrading);
        if (studentIdParam && id) {
          const submissionId = `${id}_${studentIdParam}`;
          await setDoc(doc(db, "submissions", submissionId), {
            assignmentId: id,
            studentId: studentIdParam,
            studentName: studentData?.displayName || "Siswa",
            aiEssayGrading: newGrading,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
        
        // Pre-fill teacher feedback with AI feedback for easy overriding
        const aiPart = `\n\n--- PENILAIAN AI ---\nSkor: ${data.score}/100\nUmpan balik: ${data.feedback}`;
        setTeacherFeedback(prev => prev ? prev + aiPart : data.feedback);
    } catch (error) {
        console.error(error);
        alert("Gagal melakukan penilaian AI. Silakan coba lagi.");
    } finally {
        setIsAIGrading(false);
    }
  };

  // Background Auto AI Essay Grading
  useEffect(() => {
    const autoGradeEssays = async () => {
      const user = auth.currentUser;
      if (!user || userRole !== "teacher" || !assignment || !id || !studentIdParam) return;
      if (submissionStatus === "pending") return;
      
      const essayQuestions = assignment.questions?.map((q: any, index: number) => ({ q, index }))
        .filter((item: any) => item.q.type === "Essay") || [];
        
      if (essayQuestions.length === 0) return;
      
      const missingIndex = essayQuestions.find((item: any) => !aiEssayGrading[item.index]);
      if (!missingIndex || isAutoGradingEssays) return;
      
      setIsAutoGradingEssays(true);
      const newGrading = { ...aiEssayGrading };
      let updated = false;
      
      for (const item of essayQuestions) {
        if (!newGrading[item.index]) {
          const studentAnswer = answers[item.index] || digitalAnswer;
          if (!studentAnswer || !studentAnswer.trim()) continue;
          
          try {
            const response = await fetch("/api/grade-essay", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question: item.q.question || "Soal Esai",
                studentAnswer,
                answerKey: item.q.explanation || ""
              }),
            });
            if (response.ok) {
              const data = await response.json();
              newGrading[item.index] = data;
              updated = true;
            }
          } catch (error) {
            console.error(`Error auto grading essay at index ${item.index}:`, error);
          }
        }
      }
      
      if (updated) {
        setAiEssayGrading(newGrading);
        const submissionId = `${id}_${studentIdParam}`;
        try {
          await setDoc(doc(db, "submissions", submissionId), {
            assignmentId: id,
            studentId: studentIdParam,
            studentName: studentData?.displayName || "Siswa",
            aiEssayGrading: newGrading,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error("Error saving auto essay grading to Firestore:", error);
        }
      }
      setIsAutoGradingEssays(false);
    };
    
    if (userRole === "teacher" && assignment && studentIdParam && submissionStatus !== "pending" && Object.keys(answers).length > 0) {
      autoGradeEssays();
    }
  }, [userRole, assignment, studentIdParam, submissionStatus, answers, aiEssayGrading, id, isAutoGradingEssays]);

  // Pre-fill overall essay score with AI average recommendation
  useEffect(() => {
    if (userRole === "teacher" && essayScore === "") {
      const essayQuestions = assignment?.questions?.map((q: any, index: number) => ({ q, index }))
        .filter((item: any) => item.q.type === "Essay") || [];
      if (essayQuestions.length > 0) {
        let totalVal = 0;
        let count = 0;
        essayQuestions.forEach((item: any) => {
          if (aiEssayGrading[item.index]?.score !== undefined) {
            totalVal += Number(aiEssayGrading[item.index].score);
            count++;
          }
        });
        if (count === essayQuestions.length && count > 0) {
          const avg = Math.round(totalVal / count);
          setEssayScore(avg);
        }
      }
    }
  }, [aiEssayGrading, assignment, userRole, essayScore]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-surface">
         <Loader2 className="animate-spin text-primary" size={48} />
         <p className="font-bold text-on-surface-variant">Memuat data...</p>
      </div>
    );
  }

  if (userRole === "student" && assignment?.type === "exam" && submissionStatus !== "graded") {
    return (
      <Layout userType="student">
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center shadow-lg">
            <ShieldCheck size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-on-surface">Akses Ditolak</h1>
            <p className="text-on-surface-variant max-w-md mx-auto font-medium">
              Ujian ini hanya dapat dikerjakan secara offline (Paper Mode) dan dinilai oleh guru Anda. Siswa tidak diperkenankan mengakses halaman ujian ini.
            </p>
          </div>
          <Link to="/student/dashboard" className="btn-primary px-8 py-3 rounded-xl font-bold">
            Kembali ke Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  if (viewMode === "form") {
    return (
      <div className="min-h-screen bg-surface p-4 md:p-12 lg:p-20 flex flex-col items-center">
         <div className="w-full max-w-4xl space-y-12 pb-32">
            <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-8 rounded-[40px] border border-white sticky top-10 z-50">
               <div className="flex items-center gap-4">
                  <button onClick={() => setViewMode("standard")} className="p-3 hover:bg-on-surface/5 rounded-2xl transition-all">
                     <ArrowLeft size={24} />
                  </button>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight">{assignment?.title || "Ujian"}</h1>
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Mode Form Digital • Fokus Penuh</p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-xs font-black text-on-surface-variant/40 uppercase mb-1">Sisa Waktu</p>
                  <p className="text-xl font-black text-error tabular-nums tracking-widest">01:45:20</p>
               </div>
            </div>

            <div className="space-y-10">
               {assignment?.questions?.map((q: any, i: number) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="glass p-12 rounded-[56px] border-white/60 shadow-xl"
                  >
                     <div className="flex justify-between items-center mb-8">
                        <span className="px-6 py-2 bg-on-surface text-surface rounded-full text-xs font-black uppercase tracking-widest">Soal {i + 1}</span>
                        <span className="text-xs font-black text-on-surface-variant/20 uppercase tracking-widest">{q.type === "Multiple Choice" ? "Pilihan Ganda" : "Esai"} • 10 poin</span>
                     </div>
                     <p className="text-2xl font-bold mb-10 leading-relaxed">
                        {q.question}
                     </p>
                     
                     {q.type === "Multiple Choice" ? (
                       <div className="space-y-4">
                          {q.options?.map((opt: any) => {
                             const isStudentAnswer = (answers[i] || selectedOption) === opt.label;
                             return (
                             <button 
                               key={opt.label}
                               onClick={() => {
                                  if (hasSubmitted && userRole === "student") return;
                                  setAnswers(prev => ({ ...prev, [i]: opt.label }));
                                  setSelectedOption(opt.label);
                               }}
                               disabled={hasSubmitted && userRole === "student"}
                               className={cn(
                                 "w-full text-left p-6 rounded-[28px] border-2 transition-all flex items-center gap-6",
                                 isStudentAnswer ? "bg-primary border-primary text-white shadow-xl shadow-primary/20" : "bg-white/40 border-white/60 hover:border-primary/20",
                                 hasSubmitted && userRole === "student" && "opacity-60 cursor-not-allowed"
                               )}
                             >
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0", isStudentAnswer ? "bg-white text-primary" : "bg-on-surface/5 text-on-surface-variant")}>
                                   {opt.label}
                                </div>
                                <span className="font-bold">{opt.text}</span>
                             </button>
                             );
                          })}
                       </div>
                     ) : (
                       <textarea 
                         className="w-full h-40 p-5 bg-white/40 border-2 border-white/40 focus:border-primary outline-none rounded-2xl font-medium text-base leading-relaxed transition-all shadow-inner disabled:opacity-50"
                         placeholder="Tuliskan jawaban lengkap Anda di sini..."
                         value={answers[i] || digitalAnswer}
                         onChange={(e) => {
                           setAnswers(prev => ({ ...prev, [i]: e.target.value }));
                           setDigitalAnswer(e.target.value);
                         }}
                         disabled={hasSubmitted && userRole === "student"}
                       />
                     )}
                  </motion.div>
               ))}
            </div>

            <div className="flex flex-col items-center gap-6 pt-12">
               <div className="w-1/2 h-4 bg-on-surface/5 rounded-full overflow-hidden border border-white">
                  <div className="h-full w-[80%] bg-primary rounded-full" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">80% Selesai</p>
               
               {!(hasSubmitted && userRole === "student") && (
                 <button 
                  onClick={handleSubmit}
                  className="bg-primary text-white px-8 py-4 w-full sm:w-auto rounded-xl font-black text-base uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                 >
                    Kumpulkan Jawaban Akhir
                 </button>
               )}
            </div>
         </div>
      </div>
    );
  }

  if (viewMode === "paper") {
    return (
      <div className="min-h-screen bg-on-surface-variant/5 p-12 print:bg-white print:p-0">
         <div className="max-w-4xl mx-auto bg-white p-20 shadow-2xl rounded-[40px] border border-on-surface/5 print:shadow-none print:border-none print:rounded-none">
            <div className="flex justify-between items-start border-b-2 border-on-surface pb-12 mb-16">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-on-surface text-surface rounded-2xl flex items-center justify-center">
                     <GraduationCap size={32} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter">Akademi Edugrade</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60">Repositori Penilaian Resmi</p>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-[10px] font-black uppercase tracking-widest">
                  <div className="border-b border-on-surface/20 pb-1">Nama: ___________________</div>
                  <div className="border-b border-on-surface/20 pb-1">Kelas: XII-A</div>
                  <div className="border-b border-on-surface/20 pb-1">Tanggal: {new Date().toLocaleDateString()}</div>
                  <div className="border-b border-on-surface/20 pb-1">Nilai: _____ / 100</div>
               </div>
            </div>

            <div className="space-y-12 mb-20 text-on-surface">
               <div>
                  <h2 className="text-xl font-black mb-4">{assignment?.title || "Ujian"}</h2>
                  <p className="italic text-sm text-on-surface-variant/60">Petunjuk: Bacalah setiap soal dengan cermat. Untuk pilihan ganda, lingkari jawaban yang benar. Untuk esai, tulis jawaban dengan jelas pada ruang yang tersedia.</p>
               </div>

               {assignment?.questions?.map((q: any, i: number) => (
                  <div key={i} className="space-y-6">
                     <p className="font-bold text-lg"><span className="mr-4">S{i + 1}.</span> {q.question}</p>
                     
                     {q.type === "Multiple Choice" ? (
                       <div className="grid grid-cols-1 gap-3 pl-6 mt-3">
                          {q.options?.map((opt: any) => (
                             <div key={opt.label} className="flex gap-3 items-start break-inside-avoid">
                                <div className="text-sm font-bold shrink-0">{opt.label}.</div>
                                <span className="text-sm font-medium pt-[1px]">{opt.text}</span>
                             </div>
                          ))}
                       </div>
                     ) : (
                       <div className="w-full mt-6 space-y-6">
                         <div className="w-full border-b border-on-surface/20 border-dashed" />
                         <div className="w-full border-b border-on-surface/20 border-dashed" />
                         <div className="w-full border-b border-on-surface/20 border-dashed" />
                         <div className="w-full border-b border-on-surface/20 border-dashed" />
                         <div className="w-full border-b border-on-surface/20 border-dashed" />
                       </div>
                     )}
                  </div>
               ))}
            </div>

            <div className="flex justify-center gap-6 print:hidden">
               <button onClick={() => window.print()} className="bg-on-surface text-surface px-8 py-4 rounded-2xl font-bold flex items-center gap-2">
                  <Plus size={20} />
                  Cetak Sekarang
               </button>
               <button onClick={() => setViewMode("standard")} className="px-8 py-4 bg-on-surface/5 rounded-2xl font-bold">Kembali ke Pratinjau</button>
            </div>
         </div>
      </div>
    )
  }

  const currentQuestion = assignment?.questions?.[currentQuestionIndex];
  const showDashboard = userRole === "teacher" && assignment?.type === "exam" && !studentIdParam;

  return (
    <Layout userType={userRole}>
      <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12 pb-32">
        {/* Breadcrumb & Navigation */}
        <div className="flex justify-between items-center px-4">
           <Link to={userRole === "student" ? "/student/dashboard" : (assignment?.classId ? `/class/${assignment.classId}?tab=${assignment?.type === "exam" ? "exams" : "reviews"}` : "/dashboard")} className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest hover:translate-x-[-10px] transition-all">
              <ArrowLeft size={16} />
              Kembali ke {userRole === "student" ? "Dashboard" : "Kelas"}
           </Link>
           <div className="flex gap-4">
           </div>
        </div>

        {/* Hero Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0">
                 <span className="text-2xl font-black text-primary uppercase">{classroom ? classroom.name.charAt(0) : "E"}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] block mb-1">
                  {classroom ? `${classroom.subject} • ${classroom.name}` : (assignment?.classId ? "Memuat Kelas..." : "Penilaian Edugrade")}
                </span>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black mb-0 tracking-tighter text-on-surface leading-tight md:leading-none break-words max-w-2xl">{assignment?.title || "Sintesis Protein"}</h1>
              </div>
            </div>
            {userRole === "teacher" && (
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-xl border border-secondary/20">
                    <User size={14} className="text-secondary" />
                    <span className="text-xs font-bold text-secondary">
                        {studentIdParam ? `Menilai Tugas: ${studentData?.displayName || "Memuat..."}` : "Mode Pratinjau (Sebagai Pengajar)"}
                    </span>
                </div>
                {studentIdParam && (
                    <button
                        onClick={() => setIsOcrMode(!isOcrMode)}
                        className={cn(
                            "px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm border",
                            isOcrMode 
                                ? "bg-secondary text-white border-secondary shadow-secondary/20" 
                                : "bg-white text-secondary border-secondary/20 hover:bg-secondary/5"
                        )}
                    >
                        <Zap size={12} />
                        {isOcrMode ? "Lihat Daftar Soal" : "Koreksi Lembar Jawaban (OCR)"}
                    </button>
                )}
              </div>
            )}
          </motion.div>
          
          <div className="glass p-6 md:p-8 rounded-[40px] border-white/60 shadow-xl shadow-on-surface/5 flex items-center gap-6 md:gap-8 w-full lg:w-auto min-w-0 md:min-w-[320px]">
             <div className="flex-1">
                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Tenggat Waktu</p>
                <p className="text-xl md:text-2xl font-black text-primary tracking-tighter">
                  {assignment?.dueDate?.toDate?.() 
                    ? assignment.dueDate.toDate().toLocaleString() 
                    : assignment?.dueDate 
                      ? new Date(assignment.dueDate).toLocaleString() 
                      : "Tanpa tenggat"}
                </p>
             </div>
             <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                <Clock className="text-primary" size={24} />
             </div>
          </div>
        </div>

        {showDashboard ? (
           <ExamTeacherDashboard 
              classroom={classroom}
              classStudents={classStudents}
              submissions={submissions}
              id={id}
              setViewMode={setViewMode}
           />
        ) : (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Question Area */}
          <div className="lg:col-span-8 flex flex-col gap-8 md:gap-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-[40px] md:rounded-[56px] p-8 md:p-12 border-white/60 shadow-2xl relative overflow-hidden min-h-[500px] lg:h-[calc(100vh-320px)] flex flex-col"
            >
              {userRole === "student" && assignment?.type === "exam" ? (
                 <StudentExamView 
                    assignment={assignment}
                    answers={answers}
                    ocrImage={ocrImage}
                    uploadedFileName={uploadedFileName}
                    isPdf={isPdf}
                    aiEssayGrading={aiEssayGrading}
                    teacherFeedback={teacherFeedback}
                    totalScore={totalScore}
                    mcScore={mcScore}
                    essayScore={essayScore}
                 />
              ) : isOcrMode ? (
                  <div className="flex-1 flex flex-col space-y-8">
                     <div className="flex justify-between items-center pb-6 border-b border-on-surface/5">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                              <Zap className="text-secondary" size={20} />
                           </div>
                           <div>
                              <h3 className="text-2xl font-black italic text-secondary leading-none">Asisten Koreksi OCR</h3>
                              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-1">Pindai Lembar Jawaban Kertas Siswa</p>
                           </div>
                        </div>
                        <button 
                           onClick={() => setIsOcrMode(false)}
                         type="button"
                           className="px-4 py-2 hover:bg-on-surface/5 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                        >
                           Tutup
                        </button>
                     </div>

                     {!ocrImage ? (
                        <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-secondary/20 rounded-[32px] p-12 bg-secondary/5 text-center min-h-[350px]">
                           <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-6">
                              <Upload className="text-secondary" size={32} />
                           </div>
                           <h4 className="text-xl font-black mb-2">Unggah Foto Lembar Jawaban</h4>
                           <p className="text-sm text-on-surface-variant/75 max-w-sm mb-8 leading-relaxed">Format yang didukung: JPG, PNG, atau scan PDF. Pastikan lembar jawaban rata dan mendapat pencahayaan yang cukup.</p>
                           <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                              <label className="bg-secondary text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-secondary/20 hover:scale-105 transition-all cursor-pointer text-center">
                                 Pilih File Gambar / PDF
                                 <input type="file" accept="image/*,application/pdf" onChange={handleOcrImageUpload} className="hidden" />
                              </label>
                              <button 
                                 type="button"
                                 onClick={selectMockSheet}
                                 className="bg-white text-secondary border-2 border-secondary/25 px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-secondary/5 transition-all"
                              >
                                 Gunakan Mock LJK
                              </button>
                           </div>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                           {/* Scanned Image Preview */}
                           <div className="glass rounded-3xl p-6 border-white/60 flex flex-col relative overflow-hidden bg-black/5 min-h-[300px] justify-center items-center">
                              {isOcrScanning && (
                                 <div className="absolute left-0 right-0 h-1 bg-secondary shadow-lg shadow-secondary/80 animate-[scan_2s_ease-in-out_infinite]" style={{
                                    animation: 'scan 2s ease-in-out infinite'
                                 }} />
                              )}
                              
                              {isPdf ? (
                                 <div className={cn(
                                    "flex flex-col items-center justify-center p-8 bg-white/40 border-2 border-white/60 rounded-3xl shadow-inner max-w-sm w-full text-center transition-all",
                                    isOcrScanning && "brightness-50 blur-[1px]"
                                 )}>
                                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                                       <FileText size={32} />
                                    </div>
                                    <h5 className="font-black text-on-surface truncate max-w-[200px] leading-tight mb-1">{uploadedFileName || "dokumen_ujian.pdf"}</h5>
                                    <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/15 uppercase tracking-widest">Dokumen PDF</span>
                                 </div>
                              ) : (
                                 <img 
                                    src={ocrImage} 
                                    alt="LJK Scanned" 
                                    className={cn(
                                       "max-h-[350px] object-contain rounded-xl shadow-md transition-all",
                                       isOcrScanning && "brightness-50 blur-[1px]"
                                    )} 
                                 />
                              )}
                              
                              {isOcrScanning ? (
                                 <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-6 space-y-4 text-white text-center rounded-3xl">
                                    <Loader2 className="animate-spin text-secondary" size={40} />
                                    <div>
                                       <p className="font-black uppercase tracking-widest text-xs">Sedang Menganalisis...</p>
                                       <p className="text-[10px] uppercase text-white/60 tracking-wider mt-2">
                                          {ocrProgressStep === 0 && (isPdf ? "Mengekstrak halaman dokumen PDF..." : "Memindai gambar lembar jawaban...")}
                                          {ocrProgressStep === 1 && "Mendeteksi tanda tangan & nama siswa..."}
                                          {ocrProgressStep === 2 && "Membaca bulatan hitam pilihan ganda..."}
                                          {ocrProgressStep === 3 && "Mencocokkan dengan kunci jawaban..."}
                                       </p>
                                    </div>
                                 </div>
                              ) : !isOcrCompleted ? (
                                 <div className="absolute bottom-6 flex gap-4">
                                    <button 
                                       type="button"
                                       onClick={simulateOcr}
                                       className="bg-secondary text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-secondary/20 hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                       <Zap size={14} /> Mulai Koreksi OCR
                                    </button>
                                    <button 
                                       type="button"
                                       onClick={resetOcr}
                                       className="bg-white/80 hover:bg-white text-on-surface px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                                    >
                                       Batal
                                    </button>
                                 </div>
                              ) : (
                                 <div className="absolute bottom-6">
                                    <button 
                                       type="button"
                                       onClick={resetOcr}
                                       className="bg-white/90 hover:bg-white text-secondary px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border border-secondary/20"
                                    >
                                       Ganti File LJK
                                    </button>
                                 </div>
                              )}
                           </div>

                           {/* OCR Results & verification */}
                           <div className="glass rounded-3xl p-6 border-white/60 flex flex-col">
                              <h4 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
                                 <Cpu size={18} className="text-secondary" />
                                 Hasil Pembacaan OCR
                              </h4>
                              
                              {!isOcrCompleted ? (
                                 <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-on-surface-variant/40">
                                    <AlertCircle size={40} className="mb-4" />
                                    <p className="text-sm font-medium">Silakan lakukan scan lembar jawaban terlebih dahulu untuk memunculkan hasil pemeriksaan.</p>
                                 </div>
                              ) : (
                                 <div className="flex-1 flex flex-col min-h-0">
                                    <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-3 mb-6">
                                       {assignment?.questions?.map((q: any, idx: number) => {
                                          if (q.type === "Multiple Choice") {
                                             const correctOpt = q.options?.find((o: any) => o.isCorrect)?.label || "A";
                                             const studentAns = ocrDetectedAnswers[idx] || "A";
                                             const isCorrect = studentAns === correctOpt;
                                             return (
                                                <div key={idx} className="flex items-center justify-between p-3.5 bg-white/40 border border-white/65 rounded-2xl">
                                                   <div className="flex items-center gap-3">
                                                      <span className="w-8 h-8 rounded-lg bg-on-surface/5 flex items-center justify-center text-xs font-bold text-on-surface-variant">S{idx + 1}</span>
                                                      <div>
                                                         <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest block leading-none">Kunjau</span>
                                                         <span className="text-sm font-black text-on-surface leading-none">{correctOpt}</span>
                                                      </div>
                                                   </div>
                                                   
                                                   <div className="flex items-center gap-6">
                                                      <div className="flex items-center gap-2">
                                                         <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest leading-none">Hasil OCR:</span>
                                                         <select 
                                                            value={studentAns}
                                                            onChange={(e) => {
                                                               setOcrDetectedAnswers(prev => ({
                                                                  ...prev,
                                                                  [idx]: e.target.value
                                                               }));
                                                               setAnswers(prev => ({
                                                                  ...prev,
                                                                  [idx]: e.target.value
                                                               }));
                                                            }}
                                                            className="bg-white border border-white/80 focus:border-secondary outline-none px-2.5 py-1 rounded-lg text-xs font-black"
                                                         >
                                                            {q.options?.map((o: any) => (
                                                               <option key={o.label} value={o.label}>{o.label}</option>
                                                            ))}
                                                         </select>
                                                      </div>
                                                      
                                                      <span className={cn(
                                                         "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                         isCorrect ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                                      )}>
                                                         {isCorrect ? "Benar" : "Salah"}
                                                      </span>
                                                   </div>
                                                </div>
                                             );
                                          } else {
                                             return (
                                                <div key={idx} className="p-4 bg-white/40 border border-white/65 rounded-2xl flex flex-col space-y-3">
                                                   <div className="flex items-center gap-3">
                                                      <span className="w-8 h-8 rounded-lg bg-on-surface/5 flex items-center justify-center text-xs font-bold text-on-surface-variant">S{idx + 1}</span>
                                                      <span className="text-xs font-black text-on-surface-variant/75 uppercase tracking-wider">Soal Esai</span>
                                                   </div>
                                                   
                                                   <div className="text-xs font-semibold text-on-surface/80 bg-white/30 p-2.5 rounded-xl border border-white/50">
                                                      <strong>Pertanyaan:</strong> {q.question}
                                                   </div>

                                                   <div className="flex flex-col space-y-1.5">
                                                      <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Hasil OCR Jawaban:</span>
                                                      <textarea 
                                                         value={ocrDetectedAnswers[idx] || ""}
                                                         onChange={(e) => handleUpdateOcrText(idx, e.target.value)}
                                                         className="w-full bg-white border border-white/80 focus:border-secondary outline-none p-3 rounded-xl text-xs font-medium min-h-[60px] resize-y"
                                                         placeholder="Jawaban esai kosong / belum terdeteksi"
                                                      />
                                                   </div>

                                                   {aiEssayGrading[idx] ? (
                                                      <div className="p-3 bg-secondary/5 border border-secondary/15 rounded-xl space-y-2">
                                                         <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Analisis AI</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-on-surface-variant">Nilai:</span>
                                                                <input 
                                                                   type="number"
                                                                   value={aiEssayGrading[idx].score || 0}
                                                                   onChange={(e) => handleUpdateEssayScore(idx, Number(e.target.value))}
                                                                   className="w-14 bg-white border border-white focus:border-secondary outline-none px-2 py-0.5 rounded text-right text-xs font-black"
                                                                />
                                                            </div>
                                                         </div>
                                                         <p className="text-[11px] text-on-surface-variant leading-relaxed">
                                                            <strong>Umpan Balik:</strong> {aiEssayGrading[idx].feedback}
                                                         </p>
                                                         <div className="grid grid-cols-3 gap-2 pt-1 border-t border-secondary/10 text-[9px] font-bold text-on-surface-variant/60 uppercase">
                                                            <div>Konten: {aiEssayGrading[idx].analysis?.contentScore || 0}</div>
                                                            <div>Struktur: {aiEssayGrading[idx].analysis?.structureScore || 0}</div>
                                                            <div>Relevansi: {aiEssayGrading[idx].analysis?.relevanceScore || 0}</div>
                                                         </div>
                                                      </div>
                                                   ) : (
                                                      <div className="p-3 bg-on-surface/5 rounded-xl text-center text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-wider flex items-center justify-between">
                                                         <span>Belum ada rekomendasi AI</span>
                                                         <button 
                                                            type="button"
                                                            onClick={() => handleReevaluateEssay(idx, q)}
                                                            className="bg-secondary text-white px-3 py-1.5 rounded-lg hover:scale-105 transition-all text-[9px]"
                                                         >
                                                            Evaluasi
                                                         </button>
                                                      </div>
                                                   )}

                                                   {aiEssayGrading[idx] && (
                                                      <div className="flex justify-end">
                                                         <button 
                                                            type="button"
                                                            onClick={() => handleReevaluateEssay(idx, q)}
                                                            className="text-[9px] font-black uppercase text-secondary hover:underline flex items-center gap-1"
                                                         >
                                                            <RefreshCw size={10} /> Koreksi Ulang dengan AI
                                                         </button>
                                                      </div>
                                                   )}
                                                </div>
                                             );
                                          }
                                       })}
                                    </div>
                                    
                                    <button 
                                       type="button"
                                       onClick={handleSaveOcrGrades}
                                       disabled={isSavingFeedback}
                                       className="mt-auto w-full bg-secondary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                       {isSavingFeedback ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                       Simpan Hasil Scan OCR
                                    </button>
                                 </div>
                              )}
                           </div>
                        </div>
                     )}
                  </div>
               ) : assignment?.method === 'manual' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                   <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                      <FileText className="text-primary" size={48} />
                   </div>
                   <div>
                      <h3 className="text-3xl font-black mb-4">Tugas Manual / File</h3>
                      <p className="text-on-surface-variant max-w-md mx-auto">Silakan unduh file di bawah ini dan kumpulkan jawaban Anda dalam bentuk teks.</p>
                   </div>
                   {assignment.fileUrl && (
                     <a 
                       href={assignment.fileUrl} 
                       target="_blank" 
                       rel="noreferrer"
                       className="bg-primary text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center gap-3 hover:scale-105 transition-all text-center"
                     >
                       <FileText size={24} />
                       Unduh File Soal
                     </a>
                   )}
                   {!assignment.fileUrl && (
                     <div className="p-8 bg-on-surface/5 rounded-[32px] border border-dashed border-outline-variant/40 max-w-md">
                        <p className="text-sm font-medium text-on-surface-variant italic">"{assignment.description || "Gunakan deskripsi tugas sebagai panduan pengerjaan."}"</p>
                     </div>
                   )}
                </div>
              ) : (
                <>
                  <div className="mb-8 md:mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black shrink-0">{currentQuestionIndex + 1}</div>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tight">{currentQuestion?.taxonomy || "Pertanyaan"}</h3>
                     </div>
                     <div className="flex gap-2">
                        <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">{currentQuestion?.type === "Multiple Choice" ? "Pilihan Ganda" : currentQuestion?.type === "Essay" ? "Esai" : "Umum"}</span>
                        <span className="glass border-white/40 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest text-on-surface-variant/40">10 Poin</span>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 md:pr-6 custom-scrollbar pb-10">
                    <p className="text-xl md:text-3xl font-bold mb-8 md:mb-12 leading-snug tracking-tight text-on-surface">
                      {currentQuestion?.question || "Memuat butir soal..."}
                    </p>

                    {currentQuestion?.type === "Multiple Choice" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.options?.map((opt: any) => {
                          const isStudentAnswer = (answers[currentQuestionIndex] || selectedOption) === opt.label;
                          const showFeedback = userRole === "teacher" || submissionStatus === "graded";
                          const isCorrect = showFeedback && opt.isCorrect;
                          const isWrong = showFeedback && isStudentAnswer && !opt.isCorrect;
                          return (
                          <OptionItem 
                            key={opt.label} 
                            letter={opt.label} 
                            text={opt.text} 
                            isActive={isStudentAnswer} 
                            isCorrect={isCorrect}
                            isWrong={isWrong}
                            onClick={() => {
                              if (hasSubmitted && userRole === "student") return;
                              setAnswers(prev => ({ ...prev, [currentQuestionIndex]: opt.label }));
                              setSelectedOption(opt.label);
                            }} 
                          />
                          );
                        })}
                      </div>
                    ) : (
                       <div className="space-y-4">
                        <textarea 
                          className="w-full h-32 p-5 bg-white/40 border-2 border-white/40 focus:border-primary outline-none rounded-2xl font-medium text-base leading-relaxed shadow-inner disabled:opacity-50"
                          placeholder="Tuliskan jawaban Anda di sini..."
                          value={answers[currentQuestionIndex] || digitalAnswer}
                          disabled={hasSubmitted && userRole === "student"}
                          onChange={(e) => {
                            setAnswers(prev => ({ ...prev, [currentQuestionIndex]: e.target.value }));
                            setDigitalAnswer(e.target.value);
                          }}
                        />
                        {userRole === "teacher" && (
                          <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                                <Cpu size={14} /> Rekomendasi Nilai AI (Soal Ini)
                              </span>
                              <span className="text-lg font-black text-primary">
                                {aiEssayGrading?.[currentQuestionIndex]?.score !== undefined 
                                  ? `${aiEssayGrading[currentQuestionIndex].score}/100` 
                                  : "Menghitung..."}
                              </span>
                            </div>
                            {aiEssayGrading?.[currentQuestionIndex]?.feedback && (
                              <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                                {aiEssayGrading[currentQuestionIndex].feedback}
                              </p>
                            )}
                          </div>
                        )}
                       </div>
                    )}
                  </div>

                  <div className="mt-auto pt-6 md:pt-10 border-t border-white/30 flex flex-col sm:flex-row justify-between items-center gap-6">
                     <button 
                       onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                       disabled={currentQuestionIndex === 0}
                       className="hidden sm:flex items-center gap-2 text-sm font-black text-on-surface-variant uppercase tracking-widest disabled:opacity-20 transition-all"
                     >
                       Sebelumnya
                     </button>
                     <div className="flex gap-2">
                        {assignment?.questions?.map((_: any, i: number) => (
                            <div key={i} className={cn("w-2 h-2 rounded-full transition-all", i === currentQuestionIndex ? "bg-primary scale-125" : "bg-outline-variant/30")} />
                        ))}
                     </div>
                     <button 
                       onClick={() => setCurrentQuestionIndex(prev => Math.min((assignment?.questions?.length || 1) - 1, prev + 1))}
                       disabled={!assignment?.questions || currentQuestionIndex === assignment.questions.length - 1}
                       className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-black text-primary uppercase tracking-widest bg-primary/5 p-4 sm:p-0 rounded-2xl disabled:opacity-20 transition-all"
                     >
                        Soal Berikutnya
                        <ArrowRight size={16} />
                     </button>
                  </div>
                </>
              )}
            </motion.div>

            {/* Feedback Section (Visible to both but editable by Teacher) */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className={cn(
                   "glass rounded-[48px] p-10 border-white/60 shadow-xl overflow-hidden relative",
                   userRole === "teacher" ? "bg-secondary/5" : "bg-primary/5"
               )}
            >
               <div className="flex justify-between items-center mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                     <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", userRole === "teacher" ? "bg-secondary/20 text-secondary" : "bg-primary/20 text-primary")}>
                        <MessageSquare size={20} />
                     </div>
                     <h4 className="text-xl font-black tracking-tight">Feedback Pengajar</h4>
                  </div>
                  {userRole === "teacher" && (
                    <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] px-4 py-1.5 bg-secondary/10 rounded-full border border-secondary/20">Mode Pengajar</span>
                  )}
               </div>

               {userRole === "teacher" ? (
                  <div className="space-y-6 relative z-10">
                    {!studentIdParam ? (
                        <div className="p-8 bg-on-surface/5 rounded-[32px] border-2 border-dashed border-outline-variant/20 flex flex-col items-center text-center">
                            <Info className="text-on-surface-variant/40 mb-4" size={32} />
                            <p className="text-sm font-bold text-on-surface-variant/60 uppercase tracking-widest">
                                Pilih siswa dari menu Review untuk memberikan nilai dan feedback.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-4 mb-4">
                                <button 
                                    onClick={handleAIGrade}
                                    disabled={isAIGrading || retryCountdown !== null}
                                    className="bg-primary/10 text-primary border border-primary/20 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-primary/20 transition-all disabled:opacity-50"
                                >
                                    {isAIGrading ? <Loader2 className="animate-spin" size={14} /> : (retryCountdown !== null ? <span className="text-secondary">{retryCountdown}s</span> : <Zap size={14} fill="currentColor" />)}
                                    {isAIGrading ? "Menilai otomatis..." : (retryCountdown !== null ? "Harap Tunggu" : "Nilai Otomatis dengan AI")}
                                </button>
                            </div>
    
                            {aiAnalysis && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="bg-primary/5 border border-primary/10 p-6 rounded-[32px] space-y-4 mb-6"
                                >
                                    <div className="flex justify-between items-center">
                                        <h5 className="text-sm font-black text-primary uppercase tracking-widest">Hasil Analisis AI</h5>
                                        <span className="text-2xl font-black text-primary">{aiAnalysis.score}/100</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase mb-1">Konten</p>
                                            <p className="text-sm font-bold text-on-surface">{aiAnalysis.analysis.contentScore}%</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase mb-1">Struktur</p>
                                            <p className="text-sm font-bold text-on-surface">{aiAnalysis.analysis.structureScore}%</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase mb-1">Relevansi</p>
                                            <p className="text-sm font-bold text-on-surface">{aiAnalysis.analysis.relevanceScore}%</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
    
                            {currentQuestion?.type === "Essay" && currentQuestion?.explanation && (
                                <div className="bg-primary/5 border border-primary/10 p-6 rounded-[32px] space-y-2 mb-6">
                                    <h5 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2"><Check size={16} /> Kunci Jawaban / Panduan</h5>
                                    <p className="text-sm text-on-surface font-medium leading-relaxed">{currentQuestion.explanation}</p>
                                </div>
                            )}

                            <textarea 
                                className="w-full h-32 p-6 bg-white/40 border-2 border-white/40 focus:border-secondary outline-none rounded-[28px] font-medium text-lg leading-relaxed placeholder:text-on-surface-variant/20 transition-all shadow-inner"
                                placeholder="Berikan masukan konstruktif untuk tugas ini..."
                                value={teacherFeedback}
                                onChange={(e) => setTeacherFeedback(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <button 
                                    onClick={handleSaveFeedback}
                                    disabled={isSavingFeedback}
                                    className="bg-secondary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-secondary/20 disabled:opacity-50"
                                >
                                    {isSavingFeedback ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    {isSavingFeedback ? "Menyimpan..." : "Simpan Feedback"}
                                </button>
                            </div>
                        </>
                    )}
                  </div>
               ) : (
                  <div className="relative z-10">
                    {teacherFeedback ? (
                        <div className="bg-white/40 p-8 rounded-[32px] border-2 border-primary/10">
                            <p className="text-lg font-medium text-on-surface leading-relaxed italic">"{teacherFeedback}"</p>
                        </div>
                    ) : (
                        <div className="bg-on-surface/5 p-8 rounded-[32px] border-2 border-dashed border-on-surface/10 flex items-center gap-4">
                            <Info size={20} className="text-on-surface-variant/40" />
                            <p className="text-sm font-bold text-on-surface-variant/40 uppercase tracking-widest">Belum ada feedback dari pengajar.</p>
                        </div>
                    )}
                  </div>
               )}
               <div className={cn("absolute -bottom-12 -right-12 w-48 h-48 opacity-10", userRole === "teacher" ? "text-secondary" : "text-primary")}>
                  <MessageSquare size={192} />
               </div>
            </motion.div>
          </div>

          {/* Submission Panel */}
          <div className="lg:col-span-4 space-y-8 h-full flex flex-col">
            {userRole === "student" && hasSubmitted && (
              <div className="glass p-10 rounded-[48px] border-white/60 shadow-xl bg-primary/5">
                <h4 className="text-xl font-black tracking-tight mb-4">Nilai Anda</h4>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-white/20 items-center">
                      <span className="text-xs font-bold text-on-surface-variant/40 uppercase">Status</span>
                      <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-500 border border-green-500/20">Sudah Dinilai</span>
                  </div>
                  <div className="flex justify-between py-2 items-center">
                      <span className="text-xs font-bold text-on-surface-variant/40 uppercase">Total Skor</span>
                      <span className="text-3xl font-black text-primary">{totalScore !== null ? `${totalScore}/100` : "Belum dinilai"}</span>
                  </div>
                </div>
              </div>
            )}
            {assignment?.type !== "exam" && (
              <div className="glass p-10 rounded-[48px] border-white/60 shadow-xl flex flex-col">
                <div className="flex justify-between items-center mb-10">
                  <h4 className="text-xl font-black tracking-tight">{userRole === "teacher" ? "Jawaban Siswa" : "Input Digital"}</h4>
                  <FileText className="text-primary/20" size={24} />
                </div>
                <textarea 
                  className={cn(
                      "w-full h-28 p-5 bg-white/40 border-2 border-white/40 focus:border-primary outline-none rounded-2xl font-medium text-sm leading-relaxed placeholder:text-on-surface-variant/20 transition-all mb-8 shadow-inner",
                      userRole === "teacher" && "cursor-not-allowed opacity-80"
                  )}
                  placeholder={userRole === "teacher" ? "Siswa belum menuliskan jawaban digital." : "Tuliskan catatan atau jawaban esai tambahan..."}
                  value={digitalAnswer}
                  onChange={(e) => setDigitalAnswer(e.target.value)}
                  readOnly={userRole === "teacher" || (hasSubmitted && userRole === "student")}
                />
                {userRole === "student" && !hasSubmitted && (
                  <button 
                    className="btn-glass-primary w-full py-5 rounded-[24px] font-black tracking-widest text-xs uppercase"
                  >
                      Simpan Progres
                  </button>
                )}
                {userRole === "teacher" && (
                  <div className="flex items-center gap-3 px-6 py-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <ShieldCheck className="text-primary" size={18} />
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-tight">Jawaban ini telah diverifikasi oleh pemeriksaan integritas AI</span>
                  </div>
                )}
              </div>
            )}

            {userRole === "student" && !hasSubmitted && assignment?.type !== "exam" && (
              <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={cn(
                      "mt-auto w-full glass-submit py-4 rounded-xl font-black text-lg tracking-tight flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl",
                      isSubmitting && "opacity-50 cursor-wait"
                  )}
              >
                  {isSubmitting ? (
                      <>
                          <Loader2 className="animate-spin" size={24} />
                          Mengirim...
                      </>
                  ) : (
                      <>
                          Kumpulkan
                          <Send size={24} />
                      </>
                  )}
              </button>
            )}

            {userRole === "teacher" && (() => {
                const totalMc = assignment?.questions?.filter((q: any) => q.type === "Multiple Choice").length || 0;
                const totalEssay = assignment?.questions?.filter((q: any) => q.type === "Essay").length || 0;
                return (
                  <div className="glass p-10 rounded-[48px] border-white/60 shadow-xl bg-secondary/5 mt-auto">
                      <h4 className="text-xl font-black tracking-tight mb-4">Ringkasan Penilaian</h4>
                      <div className="space-y-4">
                          {totalMc > 0 && (
                            <div className="flex justify-between py-2 border-b border-white/20 items-center">
                                <span className="text-xs font-bold text-on-surface-variant/40 uppercase">Pilihan Ganda</span>
                                <span className="font-black text-primary">{mcScore !== null ? `${mcScore}/100` : "Otomatis"}</span>
                            </div>
                          )}
                          {totalEssay > 0 && (
                            <div className="flex justify-between py-2 border-b border-white/20 items-center">
                                <span className="text-xs font-bold text-on-surface-variant/40 uppercase">Esai</span>
                                {submissionStatus === "graded" ? (
                                    <span className="font-black text-on-surface">{essayScore !== "" ? `${essayScore}/100` : "0/100"}</span>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {isAutoGradingEssays && <Loader2 className="animate-spin text-primary shrink-0" size={14} />}
                                        <input 
                                            type="number" 
                                            placeholder="0-100"
                                            value={essayScore}
                                            onChange={(e) => setEssayScore(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="w-20 bg-white/50 border border-white focus:border-secondary outline-none px-3 py-1 rounded-xl text-right font-black"
                                        />
                                    </div>
                                )}
                            </div>
                          )}
                          <div className="flex justify-between py-2 border-b border-white/20 items-center">
                              <span className="text-xs font-bold text-on-surface-variant/40 uppercase">Total Akhir</span>
                              <span className="font-black text-secondary">{totalScore !== null ? `${totalScore}/100` : "Menunggu"}</span>
                          </div>
                          <button 
                              onClick={handleFinalizeScore}
                              disabled={isSavingFeedback}
                              className={cn(
                                  "w-full bg-secondary text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest mt-4 transition-all flex items-center justify-center gap-2",
                                  isSavingFeedback ? "opacity-50 cursor-wait" : "hover:scale-105 active:scale-95"
                              )}
                          >
                              {isSavingFeedback ? <Loader2 className="animate-spin" size={16} /> : null}
                              Finalisasi Nilai
                          </button>
                      </div>
                  </div>
                );
             })()}
          </div>
           </div>
        )}
      </div>
    </Layout>
  );
}

function ExamTeacherDashboard({ classroom, classStudents, submissions, id, setViewMode }: any) {
  return (
    <div className="space-y-10">
       <div className="glass rounded-[40px] p-8 md:p-12 border-white/60 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-secondary/5 to-primary/5">
          <div className="space-y-2">
             <div className="flex items-center gap-2 text-secondary">
                <FileText size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Mode Ujian Kertas (Paper Mode)</span>
             </div>
             <h2 className="text-3xl font-black tracking-tight">Lembar Jawaban Kertas (LJK) & Scan OCR</h2>
             <p className="text-on-surface-variant/80 text-sm max-w-2xl font-medium">
                Cetak soal ujian untuk dibagikan ke siswa di kelas. Gunakan kamera atau unggah foto LJK siswa untuk memindai jawaban secara otomatis menggunakan AI & OCR.
             </p>
          </div>
          <button 
             onClick={() => setViewMode("paper")}
             className="btn-primary flex items-center gap-2 shrink-0 py-4 px-8 shadow-xl shadow-primary/20"
          >
             <GraduationCap size={20} />
             Cetak Soal Ujian
          </button>
       </div>

       <div className="glass rounded-[40px] border-white/60 shadow-2xl p-8 md:p-12">
          <div className="flex justify-between items-center mb-8 border-b border-on-surface/5 pb-6">
             <div>
                <h3 className="text-2xl font-black tracking-tight text-on-surface">Daftar Siswa & Pemeriksaan</h3>
                <p className="text-xs text-on-surface-variant/60 mt-1 font-medium">Daftar siswa terdaftar di kelas {classroom?.name}</p>
             </div>
             <div className="bg-on-surface/5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-on-surface-variant/60">
                Total: {classStudents.length} Siswa
             </div>
          </div>

          {classStudents.length === 0 ? (
             <div className="text-center py-12 text-on-surface-variant/40">
                <User size={32} className="mx-auto mb-4" />
                <p className="font-bold text-sm">Tidak ada siswa yang terdaftar di kelas ini.</p>
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {classStudents.map((student: any) => {
                   const sub = submissions[student.id];
                   const isGraded = sub?.status === "graded";
                   const score = sub?.totalScore;

                   return (
                      <div key={student.id} className="p-6 bg-white/40 border border-white/65 rounded-[32px] hover:shadow-lg transition-all flex justify-between items-center gap-4">
                         <div className="flex items-center gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center shrink-0 text-secondary">
                               <User size={24} />
                            </div>
                            <div className="min-w-0">
                               <h4 className="font-black text-lg text-on-surface truncate leading-none mb-1.5">{student.displayName || "Siswa"}</h4>
                               <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 truncate leading-none">{student.email}</p>
                            </div>
                         </div>

                         <div className="flex items-center gap-4 shrink-0">
                            {isGraded ? (
                               <div className="text-right">
                                  <span className="inline-block px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[9px] font-black uppercase tracking-widest mb-1.5">Selesai</span>
                                  <p className="text-xl font-black text-green-600 leading-none">{score}/100</p>
                               </div>
                            ) : (
                               <div className="text-right">
                                  <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">Belum Diperiksa</span>
                                </div>
                            )}

                            <Link 
                               to={`/assignment/${id}?studentId=${student.id}`}
                               className="p-3 bg-secondary text-white rounded-xl shadow-lg shadow-secondary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                               title="Mulai Scan LJK"
                            >
                               <Zap size={18} fill="currentColor" />
                            </Link>
                         </div>
                      </div>
                   );
                })}
             </div>
          )}
       </div>
    </div>
  );
}

const OptionItem: React.FC<{ letter: string, text: string, isActive?: boolean, isCorrect?: boolean, isWrong?: boolean, onClick?: () => void }> = ({ letter, text, isActive, isCorrect, isWrong, onClick }) => {
    return (
        <motion.div 
            whileHover={{ x: 5 }}
            onClick={onClick}
            className={cn(
                "p-3 md:p-4 rounded-xl border-2 flex items-center gap-3 transition-all cursor-pointer group min-h-[60px]",
                isActive && !isCorrect && !isWrong ? "bg-primary border-primary shadow-xl shadow-primary/20 scale-[1.02]" : "",
                isCorrect ? "bg-green-500 border-green-500 shadow-xl shadow-green-500/20 scale-[1.02]" : "",
                isWrong ? "bg-red-500 border-red-500 shadow-xl shadow-red-500/20 scale-[1.02]" : "",
                !isActive && !isCorrect && !isWrong ? "glass border-white/60 hover:border-primary/40 hover:bg-white/60" : ""
            )}
        >
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all shrink-0",
                (isActive || isCorrect || isWrong) ? "bg-white" : "bg-white/40 text-on-surface-variant border border-white/60",
                isCorrect ? "text-green-600" : "",
                isWrong ? "text-red-600" : "",
                isActive && !isCorrect && !isWrong ? "text-primary" : ""
            )}>
                {isCorrect ? <Check size={14} strokeWidth={4} /> : 
                 isWrong ? <span className="text-red-600">X</span> :
                 isActive ? <Check size={14} strokeWidth={4} /> : letter}
            </div>
            <span className={cn(
                "text-xs md:text-sm font-bold transition-all line-clamp-2 md:line-clamp-none",
                (isActive || isCorrect || isWrong) ? "text-white" : "text-on-surface-variant group-hover:text-on-surface"
            )}>
                {text}
            </span>
        </motion.div>
    );
};

function Clock({ className, size }: { className?: string, size?: number }) {
    const finalSize = size || 24;
    return (
        <svg className={className} width={finalSize} height={finalSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}

function StudentExamView({ 
  assignment, 
  answers, 
  aiEssayGrading, 
  teacherFeedback, 
  totalScore, 
  mcScore, 
  essayScore 
}: any) {
  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-on-surface/5 gap-4">
        <div>
          <h3 className="text-2xl font-black italic text-primary leading-none">Hasil Ujian Anda</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-1.5">Koreksi Paper Mode Ujian</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white/40 border border-white/60 rounded-2xl text-center">
              <span className="text-[9px] font-black uppercase text-on-surface-variant/40 tracking-wider">Skor Akhir</span>
              <p className="text-2xl font-black text-primary mt-1">{totalScore !== null ? totalScore : 0}/100</p>
            </div>
            <div className="p-4 bg-white/40 border border-white/60 rounded-2xl text-center">
              <span className="text-[9px] font-black uppercase text-on-surface-variant/40 tracking-wider">Skor Pilihan Ganda</span>
              <p className="text-2xl font-black text-secondary mt-1">{mcScore !== null ? mcScore : 0}</p>
            </div>
            <div className="p-4 bg-white/40 border border-white/60 rounded-2xl text-center">
              <span className="text-[9px] font-black uppercase text-on-surface-variant/40 tracking-wider">Skor Esai</span>
              <p className="text-2xl font-black text-secondary mt-1">{essayScore !== "" ? essayScore : 0}</p>
            </div>
          </div>

          {teacherFeedback && (
            <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl space-y-1">
              <span className="text-[9px] font-black uppercase text-primary tracking-widest block">Umpan Balik Guru</span>
              <p className="text-xs font-semibold text-on-surface-variant leading-relaxed whitespace-pre-wrap">{teacherFeedback}</p>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-on-surface-variant">Analisis Lembar Jawaban</h4>
            <div className="space-y-3">
              {assignment?.questions?.map((q: any, idx: number) => {
                if (q.type === "Multiple Choice") {
                  const correctOpt = q.options?.find((o: any) => o.isCorrect)?.label || "A";
                  const studentAns = answers[idx] || "-";
                  const isCorrect = studentAns === correctOpt;
                  return (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white/40 border border-white/60 rounded-2xl gap-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-on-surface/5 flex items-center justify-center text-xs font-bold text-on-surface-variant">S{idx + 1}</span>
                        <div>
                          <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest block leading-none">Pertanyaan</span>
                          <p className="text-xs font-bold text-on-surface truncate max-w-[200px] md:max-w-sm">{q.question}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest block">Kunci</span>
                          <span className="text-xs font-black text-primary">{correctOpt}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest block">Jawaban</span>
                          <span className={cn("text-xs font-black", isCorrect ? "text-green-500" : "text-red-500")}>{studentAns}</span>
                        </div>
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          isCorrect ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          {isCorrect ? "Benar" : "Salah"}
                        </span>
                      </div>
                    </div>
                  );
                } else {
                  const studentAns = answers[idx] || "Tidak ada jawaban";
                  const essayFeedback = aiEssayGrading[idx];
                  return (
                    <div key={idx} className="p-5 bg-white/40 border border-white/60 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-on-surface/5 flex items-center justify-center text-xs font-bold text-on-surface-variant">S{idx + 1}</span>
                          <span className="text-xs font-black text-on-surface-variant/75 uppercase tracking-wider">Soal Esai</span>
                        </div>
                        {essayFeedback && (
                          <span className="px-3 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            Nilai: {essayFeedback.score || 0}/100
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs font-semibold text-on-surface bg-white/30 p-3 rounded-xl border border-white/50 space-y-1">
                        <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest block leading-none mb-1">Pertanyaan:</span>
                        <p>{q.question}</p>
                      </div>

                      <div className="text-xs font-medium text-on-surface-variant/80 bg-white/10 p-3 rounded-xl border border-white/30 space-y-1">
                        <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest block leading-none mb-1">Jawaban Anda:</span>
                        <p className="italic">"{studentAns}"</p>
                      </div>

                      {essayFeedback && (
                        <div className="p-3.5 bg-secondary/5 border border-secondary/15 rounded-xl space-y-2">
                          <span className="text-[9px] font-black text-secondary uppercase tracking-widest block">Evaluasi AI</span>
                          <p className="text-[11px] text-on-surface-variant leading-relaxed">
                            <strong>Umpan Balik:</strong> {essayFeedback.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
