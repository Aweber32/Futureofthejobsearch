import PositionSwiper from './PositionSwiper';

export default function PositionReviewModal({ position, onClose }){
  if (!position) return null;
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1060, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="card" style={{width:'80%', maxWidth:900}}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start">
            <h4 className="mb-0">Position review</h4>
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Close</button>
          </div>
          <div className="mt-3">
            <PositionSwiper initialPositions={[position]} />
          </div>
        </div>
      </div>
    </div>
  );
}
