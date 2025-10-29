import Link from 'next/link';
import { motion } from 'framer-motion';
import { Edit2, Users, Search, Calendar } from 'lucide-react';

export default function PositionList({ positions = [] }){

  if (!positions || positions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          borderRadius: '16px',
          border: '2px dashed #e5e7eb',
          background: 'white',
          padding: '4rem 2rem',
          textAlign: 'center'
        }}
      >
        {/* Empty State Illustration */}
        <div 
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 1.5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Search size={36} style={{ color: '#9ca3af' }} />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
          No positions yet
        </h3>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
          Get started by creating your first position to find qualified candidates.
        </p>
        <Link 
          href="/poster/dashboard/create-position"
          className="btn"
          style={{
            background: 'linear-gradient(135deg, #6E56CF 0%, #8b5cf6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}
        >
          Create Your First Position
        </Link>
      </motion.div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {positions.map((p, index) => {
        const isOpen = (p.isOpen ?? p.IsOpen) !== undefined ? (p.isOpen ?? p.IsOpen) : true;
        const createdDate = p.createdAt || p.CreatedAt;
        const formattedDate = createdDate 
          ? new Date(createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Recently';

        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            style={{
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ padding: '1.5rem' }}>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div style={{ flex: 1 }}>
                  <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      {p.title}
                    </h3>
                    {isOpen ? (
                      <span 
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.625rem',
                          borderRadius: '9999px',
                          background: '#d1fae5',
                          color: '#065f46',
                          fontWeight: '500'
                        }}
                      >
                        Active
                      </span>
                    ) : (
                      <span 
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.625rem',
                          borderRadius: '9999px',
                          background: '#f3f4f6',
                          color: '#4b5563',
                          fontWeight: '500'
                        }}
                      >
                        Draft
                      </span>
                    )}
                  </div>
                  
                  {/* Meta Info */}
                  <div className="d-flex align-items-center gap-3 mb-3" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    <div className="d-flex align-items-center gap-1">
                      <Calendar size={14} />
                      <span>Posted {formattedDate}</span>
                    </div>
                  </div>

                  {/* Mobile Actions - Full Width Stacked Buttons */}
                  <div className="d-md-none d-flex flex-column gap-2">
                    <Link 
                      href={`/poster/position/${p.id}/candidates`}
                      className="btn btn-sm d-flex align-items-center justify-content-center gap-2 w-100"
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '0.625rem 1rem',
                        background: 'white',
                        color: '#374151',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Users size={16} />
                      View Candidates
                    </Link>
                    
                    <div className="d-flex gap-2">
                      <Link 
                        href={`/poster/dashboard/edit-position/${p.id}`}
                        className="btn btn-sm d-flex align-items-center justify-content-center gap-2 flex-fill"
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '0.625rem 1rem',
                          background: 'white',
                          color: '#374151',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Edit2 size={16} />
                        Edit
                      </Link>
                      
                      {isOpen ? (
                        <Link 
                          href={`/poster/find-candidates?positionId=${p.id}`}
                          className="btn btn-sm d-flex align-items-center justify-content-center gap-2 flex-fill"
                          style={{
                            background: 'linear-gradient(135deg, #6E56CF 0%, #8b5cf6 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.625rem 1rem',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Search size={16} />
                          Find
                        </Link>
                      ) : (
                        <button 
                          type="button"
                          className="btn btn-sm flex-fill"
                          disabled
                          style={{
                            background: '#f3f4f6',
                            color: '#9ca3af',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.625rem 1rem',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'not-allowed'
                          }}
                        >
                          <Search size={16} />
                          Find
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop Actions */}
                <div className="d-none d-md-flex gap-2">
                  <Link 
                    href={`/poster/position/${p.id}/candidates`}
                    className="btn btn-sm d-flex align-items-center gap-1"
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '0.5rem 0.875rem',
                      background: 'white',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#6E56CF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <Users size={14} />
                    View Candidates
                  </Link>
                  
                  <Link 
                    href={`/poster/dashboard/edit-position/${p.id}`}
                    className="btn btn-sm d-flex align-items-center gap-1"
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '0.5rem 0.875rem',
                      background: 'white',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#6E56CF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <Edit2 size={14} />
                    Edit
                  </Link>
                  
                  {isOpen ? (
                    <Link 
                      href={`/poster/find-candidates?positionId=${p.id}`}
                      className="btn btn-sm d-flex align-items-center gap-1"
                      style={{
                        background: 'linear-gradient(135deg, #6E56CF 0%, #8b5cf6 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.5rem 0.875rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Search size={14} />
                      Find Candidates
                    </Link>
                  ) : (
                    <button 
                      type="button"
                      className="btn btn-sm"
                      disabled
                      style={{
                        background: '#f3f4f6',
                        color: '#9ca3af',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.5rem 0.875rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'not-allowed'
                      }}
                    >
                      <Search size={14} />
                      Find Candidates
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
