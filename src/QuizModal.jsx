import React, { useState } from 'react';

const QUIZ_QUESTIONS = [
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

export default function QuizModal({ onClose, onComplete }) {
  const [answers, setAnswers] = useState({});

  const handleSelect = (qIdx, optIdx) => {
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmit = () => {
    let score = 0;
    QUIZ_QUESTIONS.forEach((q, idx) => {
      if (answers[idx] === q.correct) score++;
    });
    
    // Passing threshold is 80% (4 out of 5)
    onComplete(score >= 4);
  };

  const isAllAnswered = Object.keys(answers).length === QUIZ_QUESTIONS.length;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Module Assessment</h2>
        <p className="modal-subtitle">Answer all 5 questions. You need 80% to pass.</p>

        {QUIZ_QUESTIONS.map((q, idx) => (
          <div key={idx} className="quiz-question">
            <h4>{idx + 1}. {q.question}</h4>
            <div>
              {q.options.map((opt, oIdx) => (
                <label 
                  key={oIdx} 
                  className={`quiz-option ${answers[idx] === oIdx ? 'selected' : ''}`}
                >
                  <input 
                    type="radio" 
                    name={`q-${idx}`}
                    checked={answers[idx] === oIdx}
                    onChange={() => handleSelect(idx, oIdx)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={!isAllAnswered}
          >
            Submit Answers
          </button>
        </div>
      </div>
    </div>
  );
}
