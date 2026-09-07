import React, { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';
import { AlertCircle, CheckCircle, Play, Pause, Volume2, VolumeX, ArrowRight, RotateCcw } from 'lucide-react';
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

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function CoursePlayer({ 
  moduleKey, 
  moduleNum, 
  courseTitle, 
  moduleData, 
  moduleInfo,
  userId,
  courseId,
  updateProgress, 
  onNextModule 
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

  // Custom Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const intervalRef = useRef(null);
  const playerRef = useRef(null);
  const maxTimeRef = useRef(moduleData?.maxTimeWatched || 0);

  // Reset state on module switch
  useEffect(() => {
    setQuizState(moduleData?.passed ? 'passed' : 'idle');
    setCurrentQuestionIdx(0);
    setAnswers(Array(activeQuestions.length).fill(null));
    setScore(moduleData?.passed ? activeQuestions.length : 0);
    maxTimeRef.current = moduleData?.maxTimeWatched || 0;

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [moduleKey, moduleData?.passed, activeQuestions.length]);

  useEffect(() => {
    maxTimeRef.current = moduleData?.maxTimeWatched || 0;
  }, [moduleData?.maxTimeWatched]);

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    setDuration(10); // Short duration for test demo
    
    try {
      setVolume(playerRef.current.getVolume());
      setIsMuted(playerRef.current.isMuted());
      setPlaybackRate(playerRef.current.getPlaybackRate());
    } catch (e) {
      console.error(e);
    }
    
    if (moduleData?.maxTimeWatched > 0 && !moduleData?.passed) {
      playerRef.current.seekTo(moduleData.maxTimeWatched);
      setCurrentTime(moduleData.maxTimeWatched);
    }
  };

  const onStateChange = (event) => {
    const player = event.target;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (event.data === YouTube.PlayerState.PLAYING) {
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        const timeNow = player.getCurrentTime();
        setCurrentTime(timeNow);
        
        const currentSpeed = player.getPlaybackRate() || 1;
        const allowedBuffer = Math.max(4, currentSpeed * 2.5); 
        
        if (timeNow > maxTimeRef.current + allowedBuffer) {
          player.seekTo(maxTimeRef.current);
        } else {
          maxTimeRef.current = Math.max(maxTimeRef.current, timeNow);
          updateProgress(moduleKey, { maxTimeWatched: maxTimeRef.current });
        }
      }, 1000);
    } else {
      setIsPlaying(false);
      setCurrentTime(player.getCurrentTime());
    }
  };

  const onEnd = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
    updateProgress(moduleKey, { videoWatched: true });
  };

  // --- CONTROL ACTIONS ---
  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) playerRef.current.pauseVideo();
      else playerRef.current.playVideo();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
      if (volume === 0) {
        setVolume(50);
        playerRef.current.setVolume(50);
      }
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e) => {
    if (!playerRef.current) return;
    const val = Number(e.target.value);
    setVolume(val);
    playerRef.current.setVolume(val);
    
    if (val === 0 && !isMuted) {
      playerRef.current.mute();
      setIsMuted(true);
    } else if (val > 0 && isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    }
  };

  const handleSpeedChange = (e) => {
    if (!playerRef.current) return;
    const rate = Number(e.target.value);
    setPlaybackRate(rate);
    playerRef.current.setPlaybackRate(rate);
  };

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
      // Evaluate score
      let calculatedScore = 0;
      activeQuestions.forEach((q, idx) => {
        if (answers[idx] === q.correct) {
          calculatedScore++;
        }
      });
      
      setScore(calculatedScore);
      const percentage = (calculatedScore / activeQuestions.length) * 100;
      const passed = percentage >= passingThreshold;
      
      // Record attempt into database/attempts log
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
    if (playerRef.current) {
      playerRef.current.seekTo(0);
      setCurrentTime(0);
      playerRef.current.playVideo();
    }
  };

  const startQuiz = () => {
    setQuizState('taking');
  };

  const videoIds = {
    1: 'jNQXAC9IVRw', 
    2: 'M7lc1UVf-VE', 
    3: 'tPEE9ZwTmy0'
  };

  const currentVideoId = moduleInfo?.videoId || videoIds[moduleNum] || 'jNQXAC9IVRw';

  // --- RENDER HELPERS ---
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
    <div>
      <div className="content-header">
        <div>
          <h1>Module {moduleNum}: {moduleInfo?.title || ''}</h1>
          <p>{courseTitle}</p>
        </div>
      </div>

      {moduleData?.passed && (
        <div style={{ padding: '16px', background: '#f0fdf4', borderLeft: '4px solid #16a34a', color: '#166534', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle size={20} />
          <strong>Module Completed!</strong> You have successfully passed this module.
        </div>
      )}

      {quizState === 'idle' && (
        <>
          {/* Video with Custom Controls */}
          <div style={{ background: '#0f172a', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden', marginBottom: '32px' }}>
            
            <div className="video-wrapper">
              <YouTube
                videoId={currentVideoId}
                onReady={onPlayerReady}
                onStateChange={onStateChange}
                onEnd={onEnd}
                className="youtube-container"
                iframeClassName="youtube-iframe"
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: {
                    controls: 0, 
                    disablekb: 1,
                    rel: 0,
                    modestbranding: 1,
                    end: 10
                  }
                }}
              />
            </div>
            
            {/* Read-Only Playbar */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', gap: '16px', color: '#fff', flexWrap: 'wrap' }}>
              <button 
                onClick={togglePlayPause}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={isMuted ? 0 : volume} 
                  onChange={handleVolumeChange} 
                  style={{ width: '60px', accentColor: '#fff', cursor: 'pointer' }}
                />
              </div>

              <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#94a3b8', marginLeft: 'auto' }}>
                {formatTime(currentTime)}
              </div>
              
              <div style={{ flex: 1, minWidth: '100px', height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    background: '#fff', 
                    width: `${duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0}%`,
                    transition: 'width 0.2s linear'
                  }} 
                />
              </div>
              
              <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#94a3b8' }}>
                {formatTime(duration)}
              </div>

              <select 
                value={playbackRate} 
                onChange={handleSpeedChange}
                style={{ 
                  background: '#1e293b', color: '#fff', border: '1px solid #334155', 
                  borderRadius: '4px', padding: '4px 8px', fontSize: '13px', cursor: 'pointer' 
                }}
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x</option>
              </select>
            </div>
          </div>
          
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
