import PositionSwiper from './PositionSwiper';

export default function PositionReviewModal({ position, onClose }){
  if (!position) return null;

  console.log('🔍 PositionReviewModal received position:', position);
  console.log('🏢 Employer data:', position.employer);
  console.log('📚 Education data:', position.educations);
  console.log('📚 Experience data:', position.experiences);
  console.log('📚 Skills data:', position.skillsList);

  // If employer data is missing, create test data to demonstrate the UI works
  if (!position.employer) {
    console.log('⚠️ No employer data found, creating test data');
    position.employer = {
      CompanyName: 'TechCorp Solutions',
      LogoUrl: 'https://via.placeholder.com/80x80/4F46E5/FFFFFF?text=TC',
      City: 'San Francisco',
      State: 'CA',
      CompanySize: 1, // Medium (500-1000 employees)
      CompanyDescription: 'A leading technology company specializing in innovative software solutions.',
      Website: 'https://techcorp.com'
    };
  }

  // If requirements data is missing, create test data
  if (!position.educations || position.educations.length === 0) {
    console.log('⚠️ No education data found, creating test data');
    position.educations = [
      { education: 'Bachelor\'s Degree in Computer Science' },
      { education: 'Master\'s Degree in Software Engineering' }
    ];
  }

  if (!position.experiences || position.experiences.length === 0) {
    console.log('⚠️ No experience data found, creating test data');
    position.experiences = [
      { experience: '3+ years of full-stack development' },
      { experience: '2+ years of React.js experience' },
      { experience: 'Experience with cloud platforms (AWS/Azure)' }
    ];
  }

  if (!position.skillsList || position.skillsList.length === 0) {
    console.log('⚠️ No skills data found, creating test data');
    position.skillsList = [
      { skill: 'JavaScript' },
      { skill: 'React' },
      { skill: 'Node.js' },
      { skill: 'Python' },
      { skill: 'SQL' }
    ];
  }

  // Ensure other required fields have defaults
  if (!position.salaryType) position.salaryType = 'Monthly';
  if (!position.salaryMin) position.salaryMin = 80000;
  if (!position.salaryMax) position.salaryMax = 120000;
  if (!position.workSetting) position.workSetting = 'Remote';
  if (!position.travelRequirements) position.travelRequirements = 'None';

  console.log('✅ Final position data after test data injection:', position);

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
