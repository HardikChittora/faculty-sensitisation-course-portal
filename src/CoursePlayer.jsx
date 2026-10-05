import React, { useState, useEffect, useRef } from 'react';
import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';
import { AlertCircle, CheckCircle, Play, ArrowRight, RotateCcw } from 'lucide-react';
import { recordQuizAttempt } from './services/api';

const DEFAULT_QUIZ_QUESTIONS = [
  {
    question: "What is the primary goal of this course module?",
    options: ["To skip videos", "To learn faculty sensitization", "To sleep", "Nothing"],
    correct: 1
  },
  {
    question: "How often should you review the material?",
    options: ["Never", "Weekly", "Yearly", "Daily"],
    correct: 1
  },
  {
    question: "What is the passing score?",
    options: ["50%", "60%", "80%", "100%"],
    correct: 2
  },
  {
    question: "Who is the target audience?",
    options: ["Students", "Faculty", "Staff", "Everyone"],
    correct: 1
  },
  {
    question: "What happens if you fail this quiz?",
    options: ["Nothing", "You must re-watch the video", "You get fired", "You get a warning"],
    correct: 1
  }
];

export default function CoursePlayer({ 
  moduleKey, 
  moduleNum, 
  courseTitle, 
  moduleData, 
  moduleInfo,
  userId,
  courseId,
  updateProgress, 
  onNextModule,
  isPreviewMode
}) {
  const activeQuestions = (moduleInfo && moduleInfo.quiz && moduleInfo.quiz.length > 0) 
    ? moduleInfo.quiz 
    : DEFAULT_QUIZ_QUESTIONS;

  const passingThreshold = moduleInfo?.passingThreshold || 80;

  // Quiz State
  const [quizState, setQuizState] = useState('idle'); // 'idle' | 'taking' | 'passed' | 'failed'
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState(Array(activeQuestions.length).fill(null));
  const [score, setScore] = useState(0);

  const plyrRef = useRef(null);
  const maxTimeRef = useRef(moduleData?.maxTimeWatched || 0);
  const hasEndedRef = useRef(false);

  // Reset state on module switch
  useEffect(() => {
    setQuizState(moduleData?.passed ? 'passed' : 'idle');
    setCurrentQuestionIdx(0);
    setAnswers(Array(activeQuestions.length).fill(null));
    setScore(moduleData?.passed ? activeQuestions.length : 0);
    maxTimeRef.current = moduleData?.maxTimeWatched || 0;
    hasEndedRef.current = false;
  }, [moduleKey, moduleData?.passed, activeQuestions.length]);

  useEffect(() => {
    maxTimeRef.current = moduleData?.maxTimeWatched || 0;
  }, [moduleData?.maxTimeWatched]);

  useEffect(() => {
    const player = plyrRef.current?.plyr;
    if (!player || typeof player.on !== 'function') return;

    const timeUpdateHandler = () => {
      if (player.seeking || hasEndedRef.current) return;
      
      const currentTime = player.currentTime;
      const currentSpeed = player.speed || 1;
      const allowedBuffer = Math.max(4, currentSpeed * 2.5);

      if (currentTime > maxTimeRef.current + allowedBuffer && !moduleData?.passed) {
        player.currentTime = maxTimeRef.current;
      } else {
        if (currentTime > maxTimeRef.current) {
          maxTimeRef.current = currentTime;
          if (Math.floor(currentTime) % 5 === 0) {
            updateProgress(moduleKey, { maxTimeWatched: maxTimeRef.current });
          }
        }
      }

      // Robust end detection for YouTube
      if (player.duration > 0 && (player.duration - currentTime) <= 2 && !hasEndedRef.current) {
        endedHandler();
      }
    };

    const seekingHandler = () => {
      if (moduleData?.passed) return;
      if (player.currentTime > maxTimeRef.current + 2) {
         player.currentTime = maxTimeRef.current;
      }
    };

    const endedHandler = () => {
      hasEndedRef.current = true;
      updateProgress(moduleKey, { videoWatched: true, maxTimeWatched: maxTimeRef.current });
    };

    const readyHandler = () => {
      if (moduleData?.maxTimeWatched > 0 && !moduleData?.passed) {
        player.currentTime = moduleData.maxTimeWatched;
      }
    };

    player.on('timeupdate', timeUpdateHandler);
    player.on('seeking', seekingHandler);
    player.on('ended', endedHandler);
    player.on('ready', readyHandler);

    return () => {
      if (typeof player.off === 'function') {
        player.off('timeupdate', timeUpdateHandler);
        player.off('seeking', seekingHandler);
        player.off('ended', endedHandler);
        player.off('ready', readyHandler);
      }
    };
  }, [moduleKey, moduleData?.passed]);

  const startQuiz = () => {
    setQuizState('taking');
  };

  const videoIds = {
    1: 'jNQXAC9IVRw', 
    2: 'M7lc1UVf-VE', 
    3: 'tPEE9ZwTmy0'
  };

  const currentVideoId = moduleInfo?.videoId || videoIds[moduleNum] || 'jNQXAC9IVRw';

  const plyrSource = React.useMemo(() => ({
    type: 'video',
    sources: [
      {
        src: currentVideoId,
        provider: 'youtube',
      },
    ],
    tracks: [
      {
        kind: 'captions',
        label: 'English',
        srclang: 'en',
        src: 'data:text/vtt;base64,V0VCVlRUDQoNCjENCjAwOjAwOjAwLjAwMCAtPiAwMDowMDoxMC4wMDANCihDYXB0aW9ucyB0b2dnbGVkKQ0K',
        default: false
      }
    ]
  }), [currentVideoId]);

  const plyrOptions = React.useMemo(() => ({
    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
    settings: ['captions', 'quality', 'speed', 'loop'],
    captions: { active: false, update: true, language: 'en' },
    youtube: { noCookie: false, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1, cc_load_policy: 1 }
  }), []);

  // --- QUIZ LOGIC ---
  const handleAnswerSelect = (optIdx) => {
    setAnswers(prev => {
      const nextArr = [...prev];
      nextArr[currentQuestionIdx] = optIdx;
      return nextArr;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < activeQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      let calculatedScore = 0;
      activeQuestions.forEach((q, idx) => {
        if (answers[idx] === q.correct) {
          calculatedScore++;
        }
      });
      
      setScore(calculatedScore);
      const percentage = (calculatedScore / activeQuestions.length) * 100;
      const passed = percentage >= passingThreshold;
      
      recordQuizAttempt({
        userId: userId || '123',
        courseId: courseId || 'c1',
        moduleNum,
        score: calculatedScore,
        totalQuestions: activeQuestions.length,
        passed
      });

      if (passed) {
        setQuizState('passed');
        updateProgress(moduleKey, { passed: true });
      } else {
        setQuizState('failed');
      }
    }
  };

  const handleReattempt = () => {
    setQuizState('idle');
    setCurrentQuestionIdx(0);
    setAnswers(Array(activeQuestions.length).fill(null));
    setScore(0);
    maxTimeRef.current = 0;
    updateProgress(moduleKey, { videoWatched: false, maxTimeWatched: 0, passed: false });
    
    const player = plyrRef.current?.plyr;
    if (player && typeof player.play === 'function') {
      player.currentTime = 0;
      player.play();
    }
  };

  const onEndPreview = () => {
    hasEndedRef.current = true;
    updateProgress(moduleKey, { videoWatched: true });
  };

  const renderQuizContent = () => {
    if (quizState === 'taking') {
      const question = activeQuestions[currentQuestionIdx];
      const hasAnsweredCurrent = answers[currentQuestionIdx] !== null;

      return (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', border: '1px solid var(--border-color)', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', fontWeight: '500' }}>
            Question {currentQuestionIdx + 1} of {activeQuestions.length} &bull; Passing Score: {passingThreshold}%
          </div>
          
          <h3 style={{ fontSize: '20px', marginBottom: '32px', color: 'var(--text-main)', lineHeight: '1.4' }}>
            {question.question}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {question.options.map((opt, oIdx) => (
              <label 
                key={oIdx} 
                className={`quiz-option ${answers[currentQuestionIdx] === oIdx ? 'selected' : ''}`}
                style={{ padding: '16px 20px', fontSize: '15px' }}
              >
                <input 
                  type="radio" 
                  name={`q-${currentQuestionIdx}`}
                  checked={answers[currentQuestionIdx] === oIdx}
                  onChange={() => handleAnswerSelect(oIdx)}
                />
                {opt}
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
            <button 
              className="btn btn-primary" 
              disabled={!hasAnsweredCurrent}
              onClick={handleNextQuestion}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
            >
              {currentQuestionIdx === activeQuestions.length - 1 ? 'Submit Assessment' : 'Next Question'}
              {currentQuestionIdx !== activeQuestions.length - 1 && <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      );
    }

    if (quizState === 'passed') {
      const percentage = Math.round((score / activeQuestions.length) * 100);
      return (
        <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '60px 40px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
          <CheckCircle size={64} color="#16a34a" style={{ margin: '0 auto 24px' }} />
          <h2 style={{ color: '#166534', margin: '0 0 16px', fontSize: '28px' }}>Assessment Passed!</h2>
          <p style={{ color: '#15803d', fontSize: '18px', marginBottom: '32px', fontWeight: '500' }}>
            You scored {percentage}% ({score}/{activeQuestions.length}).
          </p>
          <p style={{ color: '#166534', marginBottom: '40px', fontSize: '16px' }}>
            You have successfully mastered this module. You may now continue to the next section.
          </p>
          
          <button 
            style={{ 
              padding: '16px 40px', fontSize: '18px', borderRadius: '4px', 
              background: 'var(--primary)', color: '#fff', border: 'none', 
              fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
              transition: 'background 0.2s'
            }} 
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-hover)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'var(--primary)'; }}
            onClick={onNextModule}
          >
            {moduleNum < 3 ? `Continue to Module ${moduleNum + 1}` : "Return to Dashboard"} <ArrowRight size={20} />
          </button>
        </div>
      );
    }

    if (quizState === 'failed') {
      const percentage = Math.round((score / activeQuestions.length) * 100);
      return (
        <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '60px 40px', border: '1px solid #fecaca', textAlign: 'center' }}>
          <AlertCircle size={64} color="#dc2626" style={{ margin: '0 auto 24px' }} />
          <h2 style={{ color: '#991b1b', margin: '0 0 16px' }}>Assessment Failed</h2>
          <p style={{ color: '#b91c1c', fontSize: '18px', marginBottom: '16px' }}>
            You scored {percentage}% ({score}/{activeQuestions.length}).
          </p>
          <p style={{ color: '#991b1b', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
            A minimum score of {passingThreshold}% is required to pass. You must re-watch the video lecture completely before attempting the quiz again.
          </p>
          <button className="btn btn-danger" onClick={handleReattempt} style={{ padding: '12px 32px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
            <RotateCcw size={18} /> Reattempt Module
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="course-player-container">
      <div className="content-header">
        <div>
          <h1>Module {moduleNum}: {moduleInfo?.title || ''}</h1>
          <p>{courseTitle}</p>
        </div>
      </div>

      {moduleData?.passed && (
        <div style={{ padding: '16px', background: '#f0fdf4', borderLeft: '4px solid #16a34a', color: '#166534', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle size={20} />
          <strong>Module Completed!</strong> You have successfully passed this module. You can re-watch the lecture anytime.
        </div>
      )}

      {(quizState === 'idle' || quizState === 'passed') && (
          <>
            {!moduleData?.passed && (
              <style>
                {`.plyr-no-skip .plyr__progress { pointer-events: none !important; opacity: 0.9; }`}
              </style>
            )}
            {/* Plyr Video Player */}
            <div className={!moduleData?.passed ? 'plyr-no-skip' : ''} style={{ background: '#0f172a', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', margin: '0 auto 32px auto', width: '100%', maxWidth: 'calc(70vh * 16 / 9)' }}>
              <Plyr 
                ref={plyrRef} 
                source={plyrSource} 
                options={plyrOptions} 
              />
            </div>

          {isPreviewMode && !moduleData?.passed && quizState === 'idle' && !moduleData?.videoWatched && (
            <div style={{ padding: '0 0 24px 0', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-outline" 
                onClick={onEndPreview}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', borderColor: 'var(--border-color)', fontWeight: '600' }}
              >
                <Play size={16} /> Skip Video (Admin Preview)
              </button>
            </div>
          )}
          
          {moduleData?.videoWatched && !moduleData?.passed && (
            <div style={{ padding: '16px 20px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--primary)', color: 'var(--text-main)', borderRadius: '4px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle size={20} />
                <strong>Successfully completed the video!</strong> Take the test to continue.
              </div>
              <button className="btn btn-primary" onClick={startQuiz}>
                Take Test
              </button>
            </div>
          )}
        </>
      )}

      {quizState !== 'idle' && (
        <div style={{ marginTop: '24px' }}>
          {renderQuizContent()}
        </div>
      )}
    </div>
  );
}
