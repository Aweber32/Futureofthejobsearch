import { useState, useEffect, useRef } from 'react';

const DEGREES_LIST = [
  "Accounting",
  "Actuarial Science",
  "Advertising",
  "Aerospace Engineering",
  "African Studies",
  "African-American Studies",
  "Agricultural Business & Technology",
  "Agricultural Economics",
  "Agricultural Operations",
  "Animal Science",
  "Anthropology",
  "Applied Mathematics",
  "Archaeology",
  "Architectural Engineering",
  "Architecture",
  "Art",
  "Art History",
  "Arts Management",
  "Asian Studies",
  "Athletic Training",
  "Audiology",
  "Aviation",
  "Biochemistry",
  "Biology",
  "Biomedical Engineering",
  "Biomedical Science",
  "Biopsychology, Cognition & Neuroscience",
  "Biotechnology",
  "Botany/Plant Biology",
  "Business Administration & Management",
  "Business Communications",
  "Chemical Engineering",
  "Chemical Physics",
  "Chemistry",
  "Child Development",
  "Cinematography & Film/Video Production",
  "Civil Engineering",
  "Classics",
  "Clinical Psychology",
  "Cognitive Science",
  "Communication Disorders / Speech Communication",
  "Communications Studies / Rhetoric",
  "Comparative Literature",
  "Computer & Information Science",
  "Computer Engineering",
  "Computer Graphics",
  "Computer Systems Analysis",
  "Construction Management",
  "Counseling",
  "Creative Writing",
  "Criminal Justice",
  "Criminology",
  "Culinary Arts",
  "Cybersecurity",
  "Dance",
  "Data Science",
  "Dental Hygiene",
  "Design & Visual Communications",
  "Dietetics",
  "Digital Media / Multimedia",
  "Drawing",
  "Early Childhood Education",
  "East Asian Studies",
  "Ecology",
  "Economics",
  "Education Administration & Supervision",
  "Electrical Engineering",
  "Elementary Education",
  "Emergency Management",
  "Engineering Mechanics",
  "Engineering Physics",
  "English",
  "Entomology",
  "Entrepreneurship",
  "Environmental Design/Architecture",
  "Environmental Engineering",
  "Environmental Science",
  "Epidemiology",
  "Equine Studies",
  "Ethnic Studies",
  "European History",
  "Experimental Psychology",
  "Fashion Design",
  "Film Studies",
  "Finance",
  "Fine/Studio Arts",
  "Food Science",
  "Forensic Science",
  "Forestry",
  "French Studies",
  "Game Design",
  "Genetics",
  "Geography",
  "Geological Engineering",
  "Geology",
  "German Studies",
  "Graphic Design",
  "Health Administration",
  "Health Informatics",
  "Health Professions & Related Programs",
  "Hebrew Studies",
  "Hispanic-American / Chicano Studies",
  "History",
  "Home Economics / Family & Consumer Sciences",
  "Horticulture",
  "Hospitality Management",
  "Human Development",
  "Human Resources Management",
  "Human Nutrition",
  "Human Services",
  "Industrial Design",
  "Industrial Engineering",
  "Industrial Management",
  "Information Science & Technology",
  "Information Systems",
  "Interior Design",
  "International Business",
  "International Relations",
  "International Studies",
  "Islamic Studies",
  "Italian Studies",
  "Japanese Studies",
  "Jazz Studies / Music Performance",
  "Jewish Studies",
  "Journalism",
  "Kinesiology",
  "Landscape Architecture",
  "Landscape Horticulture",
  "Latin American Studies",
  "Legal Studies",
  "Library Science",
  "Linguistics",
  "Logistics & Materials Management",
  "Management Information Systems",
  "Managerial Economics",
  "Marketing",
  "Materials Science Engineering",
  "Mathematics",
  "Mechanical Engineering",
  "Medical Technology",
  "Medieval & Renaissance Studies",
  "Mental Health Services",
  "Metallurgical Engineering",
  "Microbiology",
  "Middle Eastern Studies",
  "Military Science",
  "Mineral Engineering",
  "Molecular Biology",
  "Mortuary Science",
  "Museum Studies",
  "Music Therapy",
  "Music History",
  "Music Management",
  "Natural Resources Conservation",
  "Naval Architecture & Marine Engineering",
  "Neurobiology",
  "Neuroscience",
  "Nuclear Engineering",
  "Nursing",
  "Nutrition Science",
  "Occupational Therapy",
  "Ocean Engineering",
  "Oceanography",
  "Operations Management",
  "Organizational Behavior Studies",
  "Painting",
  "Paleontology",
  "Pastoral Studies",
  "Peace Studies",
  "Petroleum Engineering",
  "Pharmacology",
  "Pharmacy Sciences",
  "Philosophy",
  "Photography",
  "Physical Education",
  "Physics",
  "Plant Pathology",
  "Political Science",
  "Psychology",
  "Public Administration",
  "Public Health",
  "Public Policy",
  "Public Relations",
  "Real Estate",
  "Recreation & Leisure Studies",
  "Religious Studies / Theology",
  "Respiratory Therapy",
  "Risk Management & Insurance",
  "Robotics Engineering",
  "Social Work",
  "Sociology",
  "Software Engineering",
  "Spanish Studies",
  "Special Education",
  "Sport Management",
  "Supply Chain Management",
  "Sustainable Resource Management",
  "Systems Engineering",
  "Technical Writing",
  "Theatre Arts / Drama"
];

export default function DegreeAutocomplete({ value, onChange, onAdd = () => {}, placeholder = "Degree (e.g., Computer Science)" }) {
  const [filteredDegrees, setFilteredDegrees] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value && value.trim().length > 0) {
      const searchTerm = value.toLowerCase();
      const filtered = DEGREES_LIST.filter(degree => 
        degree.toLowerCase().includes(searchTerm)
      ).slice(0, 10); // Limit to 10 suggestions
      setFilteredDegrees(filtered);
      setShowDropdown(filtered.length > 0);
      setSelectedIndex(-1);
    } else {
      setFilteredDegrees([]);
      setShowDropdown(false);
    }
  }, [value]);

  const handleKeyDown = (e) => {
    if (!showDropdown || filteredDegrees.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onAdd();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredDegrees.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredDegrees.length) {
          selectDegree(filteredDegrees[selectedIndex]);
        } else {
          onAdd();
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectDegree = (degree) => {
    onChange({ target: { value: degree } });
    setShowDropdown(false);
    setSelectedIndex(-1);
    // Focus back on input so user can click Add button
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={wrapperRef} className="position-relative">
      <input
        ref={inputRef}
        className="form-control"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showDropdown && filteredDegrees.length > 0 && (
        <div 
          className="position-absolute w-100 bg-white border rounded shadow-sm mt-1" 
          style={{ 
            maxHeight: '250px', 
            overflowY: 'auto', 
            zIndex: 1000 
          }}
        >
          {filteredDegrees.map((degree, index) => (
            <div
              key={degree}
              className={`px-3 py-2 cursor-pointer ${
                index === selectedIndex ? 'bg-primary text-white' : 'hover-bg-light'
              }`}
              style={{ 
                cursor: 'pointer',
                backgroundColor: index === selectedIndex ? '#6366f1' : 'transparent'
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => selectDegree(degree)}
            >
              {degree}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
