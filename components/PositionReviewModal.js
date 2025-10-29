import PositionSwiper from './PositionSwiper';

export default function PositionReviewModal({ position, onClose, onInterested, onNotInterested }){
  if (!position) return null;

  console.log('🔍 PositionReviewModal received position:', position);
  console.log('🏢 Employer data:', position.employer);
  console.log('📚 Education data:', position.educations);
  console.log('📚 Experience data:', position.experiences);
  console.log('📚 Skills data:', position.skillsList);

  return (
    <div 
      style={{
        position:'fixed', 
        inset:0, 
        background:'rgba(0,0,0,0.5)', 
        zIndex:1060, 
        overflowY:'auto',
        WebkitOverflowScrolling: 'touch'
      }}
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="container py-5" 
        style={{
          minHeight: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center'
        }}
      >
        <div className="card border-0 shadow-lg" style={{width:'100%', maxWidth:900, margin: '0 auto'}}>
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start mb-4">
              <h4 className="mb-0 fw-bold">Position Review</h4>
              <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
                <i className="fas fa-times me-2"></i>Close
              </button>
            </div>
            <div>
              <PositionSwiper 
                initialPositions={[position]} 
                onInterested={onInterested}
                onNotInterested={onNotInterested}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
