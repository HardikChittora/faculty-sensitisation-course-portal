import React, { useState, useEffect } from 'react';
import { 
  BookOpen, CheckCircle, LogOut, ArrowLeft, 
  ChevronDown, ChevronRight, PlayCircle, FileText, Award 
} from 'lucide-react';
import CoursePlayer from './CoursePlayer';
import { fetchCourseData, fetchUserProgress, updateUserProgressApi } from './services/api';

export default function Dashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('browse'); // 'browse', 'completed', 'course'
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [expandedModules, setExpandedModules] = useState({ 1: true });
  
  const [courseData, setCourseData] = useState(null);
  const [progress, setProgress] = useState({
    'c1-m1': { unlocked: true, passed: false, videoWatched: false, maxTimeWatched: 0 },
    'c1-m2': { unlocked: false, passed: false, videoWatched: false, maxTimeWatched: 0 },
    'c1-m3': { unlocked: false, passed: false, videoWatched: false, maxTimeWatched: 0 },
  });

  useEffect(() => {
    async function loadData() {
      const course = await fetchCourseData();
      setCourseData(course);
      if (user?.id) {
        const userProg = await fetchUserProgress(user.id, course.id || 'c1');
        setProgress(userProg);
      }
    }
    loadData();
  }, [user]);

  const coursesList = courseData ? [courseData] : [];

  const handleModuleClick = (courseId, modNum) => {
    const modKey = `${courseId}-m${modNum}`;
    if (progress[modKey]?.unlocked) {
      setActiveModule({ courseId, modNum, modKey });
      setExpandedModules(prev => ({ ...prev, [modNum]: true }));
    }
  };

  const toggleModuleExpansion = (modNum, e) => {
    e.stopPropagation();
    setExpandedModules(prev => ({ ...prev, [modNum]: !prev[modNum] }));
  };

  const updateModuleProgress = async (modKey, updates) => {
    setProgress(prev => {
      const updated = { ...prev };
      updated[modKey] = { ...updated[modKey], ...updates };
      
      if (updates.passed) {
        const parts = modKey.split('-m');
        const nextModNum = parseInt(parts[1]) + 1;
        const nextModKey = `${parts[0]}-m${nextModNum}`;
        if (updated[nextModKey]) {
          updated[nextModKey].unlocked = true;
        }
      }
      return updated;
    });

    if (user?.id) {
      await updateUserProgressApi(user.id, modKey, updates);
    }
  };

  const isCourseCompleted = (courseId) => {
    const course = coursesList.find(c => c.id === courseId);
    if (!course) return false;
    for (let i = 1; i <= course.totalModules; i++) {
      if (!progress[`${courseId}-m${i}`]?.passed) return false;
    }
    return true;
  };

  const handleCourseStart = (course) => {
    setSelectedCourse(course);
    setCurrentView('course');
    
    let modToOpen = 1;
    for (let i = 1; i <= course.totalModules; i++) {
      const modData = progress[`${course.id}-m${i}`];
      if (modData?.unlocked && !modData?.passed) {
        modToOpen = i;
        break;
      }
    }
    setExpandedModules({ [modToOpen]: true });
    handleModuleClick(course.id, modToOpen);
  };

  const handleGoBack = () => {
    setCurrentView('browse');
    setSelectedCourse(null);
    setActiveModule(null);
  };

  // --- RENDER SIDEBAR ---
  const renderSidebar = () => {
    if (currentView === 'course' && selectedCourse) {
      return (
        <div className="sidebar">
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', width: '100%' }} onClick={handleGoBack}>
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>
          
          <div className="profile-section" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--primary)' }}>{selectedCourse.title}</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{selectedCourse.totalModules} Modules</p>
          </div>

          <div className="nav-section" style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
            {[1, 2, 3].map(modNum => {
              const modKey = `${selectedCourse.id}-m${modNum}`;
              const modData = progress[modKey] || { unlocked: modNum === 1, passed: false };
              const isExpanded = expandedModules[modNum];
              const isActiveMod = activeModule?.modKey === modKey;
              const isLocked = !modData.unlocked;

              return (
                <div key={modKey} style={{ marginBottom: '12px' }}>
                  <div 
                    onClick={() => !isLocked && handleModuleClick(selectedCourse.id, modNum)}
                    style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                      padding: '12px', borderRadius: '8px',
                      background: isActiveMod ? '#f4f4f5' : (isLocked ? '#f8fafc' : '#ffffff'),
                      border: `1px solid ${isActiveMod ? 'var(--primary)' : 'var(--border-color)'}`,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.6 : 1,
                      fontWeight: isActiveMod ? '600' : '500',
                      color: isActiveMod ? 'var(--primary)' : 'var(--text-main)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {modData.passed ? (
                        <CheckCircle size={18} color="var(--success)" />
                      ) : isLocked ? (
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #cbd5e1' }} />
                      ) : (
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--primary)' }} />
                      )}
                      Module {modNum}
                    </div>
                    <div onClick={(e) => !isLocked && toggleModuleExpansion(modNum, e)} style={{ padding: '4px' }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>

                  {isExpanded && !isLocked && (
                    <div style={{ padding: '8px 12px 8px 32px', borderLeft: '2px solid #e2e8f0', marginLeft: '20px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: modData.videoWatched ? 'var(--success)' : 'var(--text-muted)', marginBottom: '8px' }}>
                        <PlayCircle size={14} /> Video Lecture
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: modData.passed ? 'var(--success)' : 'var(--text-muted)' }}>
                        <FileText size={14} /> Assessment
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Default Dashboard Sidebar
    return (
      <div className="sidebar">
        <div className="profile-section">
          <div className="profile-avatar">{user.name?.charAt(0) || 'U'}</div>
          <div className="profile-info">
            <h3>{user.name}</h3>
            <p>{user.department}</p>
          </div>
        </div>

        <div className="nav-section">
          <div 
            className={`nav-item ${currentView === 'browse' ? 'active' : ''}`}
            onClick={() => setCurrentView('browse')}
          >
            <BookOpen size={18} /> Browse Courses
          </div>
          
          <div 
            className={`nav-item ${currentView === 'completed' ? 'active' : ''}`}
            onClick={() => setCurrentView('completed')}
          >
            <Award size={18} /> Courses Completed
          </div>
        </div>

        <div style={{ flex: 1 }}></div>
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    );
  };

  // --- RENDER MAIN AREA ---
  const renderMainArea = () => {
    if (currentView === 'course' && activeModule && selectedCourse) {
      const currentModuleInfo = courseData?.modules?.[activeModule.modNum];

      return (
        <CoursePlayer 
          moduleKey={activeModule.modKey} 
          moduleNum={activeModule.modNum}
          courseTitle={selectedCourse.title}
          moduleData={progress[activeModule.modKey]}
          moduleInfo={currentModuleInfo}
          userId={user.id}
          courseId={selectedCourse.id}
          updateProgress={updateModuleProgress}
          onNextModule={() => {
            const nextMod = activeModule.modNum + 1;
            if (nextMod <= selectedCourse.totalModules) {
              handleModuleClick(selectedCourse.id, nextMod);
            } else {
              handleGoBack();
            }
          }}
        />
      );
    }

    if (currentView === 'browse') {
      return (
        <div className="course-catalog">
          <h2>Browse Available Courses</h2>
          <div className="course-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
            {coursesList.map(course => (
              <div key={course.id} className="course-card big-card" onClick={() => handleCourseStart(course)}>
                <div className="card-image" style={{ backgroundImage: `url(${course.image})` }}></div>
                <div className="card-content">
                  <h3>{course.title}</h3>
                  <p className="card-desc">{course.description}</p>
                  <div className="card-meta">
                    <span>{course.totalModules} Modules</span>
                    <span className="badge">Mandatory Faculty Training</span>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px', padding: '12px' }}>
                    Open Course
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (currentView === 'completed') {
      const completedCourses = coursesList.filter(c => isCourseCompleted(c.id));
      return (
        <div className="course-catalog">
          <h2>Courses Completed</h2>
          {completedCourses.length > 0 ? (
            <div className="course-cards">
              {completedCourses.map(course => (
                <div key={course.id} className="course-card big-card" style={{ borderLeft: '4px solid var(--success)' }}>
                  <div className="card-image" style={{ backgroundImage: `url(${course.image})`, filter: 'grayscale(100%)' }}></div>
                  <div className="card-content">
                    <h3>{course.title}</h3>
                    <p className="card-desc">You have successfully completed all modules and passed the mandatory assessments for this course.</p>
                    <p style={{ color: 'var(--success)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                      <CheckCircle size={16} /> Fully Completed & Certified
                    </p>
                    <button 
                      style={{ 
                        width: '100%', padding: '14px', marginTop: 'auto', 
                        background: 'var(--primary)', 
                        color: 'white', border: 'none', borderRadius: '4px', 
                        fontWeight: '600', fontSize: '15px', display: 'flex', 
                        justifyContent: 'center', alignItems: 'center', gap: '8px',
                        cursor: 'pointer', transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-hover)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'var(--primary)'; }}
                      onClick={() => alert(`Certificate of Completion issued to ${user.name} for Faculty Sensitization.`)}
                    >
                      <Award size={18} /> View Verified Certificate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="course-empty-state" style={{ marginTop: '60px' }}>
              <Award style={{ width: '64px', height: '64px', color: '#cbd5e1', marginBottom: '16px' }} />
              <h3>No courses completed yet</h3>
              <p>Finish all modules in a course to earn your official completion certificate.</p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="app-layout">
      {renderSidebar()}
      <div className="main-area">
        {renderMainArea()}
      </div>
    </div>
  );
}
