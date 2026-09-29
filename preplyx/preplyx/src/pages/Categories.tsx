import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, GraduationCap, FileText, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function Categories() {
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        setLoading(true);
        const data = await api.getExams();
        
        const transformedExams = Object.entries(data || {}).map(([key, exam]: [string, any]) => ({
          id: key.toLowerCase(),
          name: exam.displayName || key,
          description: exam.desc,
          subjects: exam.subjects,
          years: exam.years,
          color: exam.color,
          icon: BookOpen,
          questions: exam.questionCount || '0'
        }));
        
        setExamTypes(transformedExams);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch exam data');
      } finally {
        setLoading(false);
      }
    };

    fetchExamData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <BookOpen size={48} color="var(--color-text-muted)" style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: 'var(--color-text-muted)' }}>Loading exam categories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <CheckCircle size={48} color="var(--color-primary)" style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: 'var(--color-primary)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '4px' }}>
          Exam Categories
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Select your exam type and choose subjects to start practicing
        </p>
      </div>

      {/* Exam Type Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px', marginBottom: '32px' }}>
        {(examTypes || []).map((exam) => (
          <Link
            key={exam.id}
            to={`/dashboard/practice?exam=${exam.id}`}
            style={{
              textDecoration: 'none',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
              border: 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'block',
              position: 'relative',
              overflow: 'hidden'
            }}
            className="exam-category-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '4px' }}>
                  {exam.name}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {exam.description}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'rgba(123, 47, 247, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <exam.icon size={24} color="var(--color-primary)" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Questions
                </p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  {exam.questions}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Years
                </p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  {exam.years}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Subjects
                </p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  {exam.subjects.length}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {(exam.subjects || []).slice(0, 4).map((subject: string) => (
                <span
                  key={subject}
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    backgroundColor: `${exam.color}10`,
                    color: exam.color,
                    fontWeight: 500
                  }}
                >
                  {subject}
                </span>
              ))}
              {exam.subjects.length > 4 && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  +{exam.subjects.length - 4} more
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: exam.color, fontWeight: 600, fontSize: '13px' }}>
              Start Practice <ArrowRight size={16} />
            </div>
          </Link>
        ))}
      </div>

      {/* Subject Selection Guide */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
        border: 'none'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '16px' }}>
          How to Get Started
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
          {[
            { step: '1', title: 'Select Exam Board', desc: 'Choose from JAMB, WAEC, NECO, or Post UTME' },
            { step: '2', title: 'Choose Subjects', desc: 'Pick the subjects you want to practice' },
            { step: '3', title: 'Start CBT Practice', desc: 'Begin answering questions and track progress' }
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', gap: '14px', alignItems: 'center', borderRadius: '14px', padding: '14px', backgroundColor: '#F8F5FF' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '15px',
                flexShrink: 0
              }}>
                {item.step}
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '2px' }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.3' }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
