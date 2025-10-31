import { useState, useEffect, useRef } from 'react';

// Ordered list provided by user. Do not sort; preserve original order.
const UNIVERSITY_LIST = [
  "Massachusetts Institute of Technology (MIT)",
  "Harvard University",
  "Stanford University",
  "Cornell University",
  "University of California, Berkeley",
  "University of Washington",
  "University of Michigan",
  "Columbia University",
  "University of Pennsylvania",
  "Yale University",
  "University of California, Los Angeles",
  "University of Wisconsin-Madison",
  "University of Texas at Austin",
  "University of Minnesota Twin Cities",
  "Purdue University",
  "University of Chicago",
  "New York University",
  "Princeton University",
  "University of California, Davis",
  "University of California, San Diego",
  "University of Florida",
  "University of Southern California",
  "Carnegie Mellon University",
  "Johns Hopkins University",
  "Duke University",
  "University of Illinois Urbana-Champaign",
  "Michigan State University",
  "Arizona State University",
  "University of North Carolina at Chapel Hill",
  "Rutgers University",
  "Texas A&M University",
  "University of Colorado Boulder",
  "University of Maryland",
  "University of Virginia",
  "University of Arizona",
  "Northwestern University",
  "Ohio State University",
  "University of California, Irvine",
  "Washington University in St. Louis",
  "North Carolina State University",
  "Penn State University",
  "Boston University",
  "Indiana University Bloomington",
  "University of Utah",
  "University of Pittsburgh",
  "Virginia Tech",
  "Brigham Young University",
  "University of California, Santa Barbara",
  "Georgetown University",
  "University of Nebraska-Lincoln",
  "Georgia Institute of Technology",
  "Tufts University",
  "University of Georgia",
  "Brown University",
  "Oregon State University",
  "University of Rochester",
  "California Institute of Technology",
  "University of Iowa",
  "University of Massachusetts Amherst",
  "George Washington University",
  "George Mason University",
  "Iowa State University",
  "Colorado State University",
  "University at Buffalo (SUNY)",
  "University of Connecticut",
  "Vanderbilt University",
  "University of California, San Francisco",
  "Syracuse University",
  "Florida State University",
  "University of Houston",
  "University of Oregon",
  "Washington State University",
  "University of Notre Dame",
  "Emory University",
  "University of South Florida",
  "Rice University",
  "Dartmouth College",
  "University of California, Santa Cruz",
  "University of Illinois Chicago",
  "University of Kentucky",
  "University of California, Riverside",
  "University of Central Florida",
  "Georgia State University",
  "University of Kansas",
  "University of Missouri",
  "University of Delaware",
  "Northeastern University",
  "University of South Carolina",
  "University of New Mexico",
  "University of Miami",
  "University of Tennessee, Knoxville",
  "Louisiana State University",
  "Rochester Institute of Technology",
  "Boston College",
  "University of Cincinnati",
  "University of North Texas",
  "Temple University",
  "San Diego State University",
  "University of Oklahoma",
  "Drexel University",
  "Florida International University",
  "University of Vermont",
  "University of New Hampshire",
  "Case Western Reserve University",
  "Clemson University",
  "Fordham University",
  "Virginia Commonwealth University",
  "Oklahoma State University",
  "Utah State University",
  "American University",
  "University of Alabama",
  "Rensselaer Polytechnic Institute",
  "University of Maryland, Baltimore County",
  "West Virginia University",
  "Auburn University",
  "University of Arkansas",
  "Wayne State University",
  "Portland State University",
  "Tulane University",
  "Stony Brook University",
  "University of Texas at Dallas",
  "Baylor University",
  "University of Tennessee at Martin",
  "University at Albany (SUNY)",
  "San Jose State University",
  "University of Nevada, Reno",
  "Mississippi State University",
  "San Francisco State University",
  "University of Alabama at Birmingham",
  "University of North Carolina at Charlotte",
  "Brandeis University",
  "Southern Methodist University",
  "California State University, Northridge",
  "Liberty University",
  "Northern Illinois University",
  "Texas Tech University",
  "College of William & Mary",
  "University of Wisconsinâ€“Milwaukee",
  "University of Denver",
  "California Polytechnic State University, San Luis Obispo",
  "Marquette University",
  "Kent State University",
  "DePaul University",
  "Loyola University Chicago",
  "Michigan Technological University",
  "Florida Atlantic University",
  "Montana State University",
  "University of Nevada, Las Vegas",
  "Kansas State University",
  "Santa Clara University",
  "Northern Arizona University",
  "University of Rhode Island",
  "New Mexico State University",
  "University of Texas MD Anderson Cancer Center",
  "University of Idaho",
  "University of Louisville",
  "Oregon Health & Science University",
  "Southern New Hampshire University",
  "Quinnipiac University",
  "Binghamton University (SUNY)",
  "United States Military Academy",
  "University of Mississippi",
  "Swarthmore College",
  "Western Michigan University",
  "Saint Louis University",
  "Middle Tennessee State University",
  "University of Wyoming",
  "Wake Forest University",
  "Lehigh University",
  "Indiana Universityâ€“Purdue University Indianapolis",
  "Texas State University",
  "The New School",
  "University of Texas at Arlington",
  "University of Missouriâ€“Kansas City",
  "Illinois Institute of Technology",
  "Bowling Green State University",
  "James Madison University",
  "Old Dominion University",
  "University of Maryland, Baltimore",
  "Worcester Polytechnic Institute",
  "California State University, Fullerton",
  "University of Richmond",
  "California State University, Long Beach",
  "University of Maine",
  "University of Texas at San Antonio",
  "Williams College",
  "University of Montana",
  "Nova Southeastern University",
  "Grand Canyon University",
  "Southern Illinois University Carbondale",
  "Middlebury College",
  "University of Massachusetts Boston",
  "University of Alaska Fairbanks",
  "Ohio University",
  "California State University, Chico",
  "Grand Valley State University",
  "Western Washington University",
  "Appalachian State University",
  "University of Texas at El Paso",
  "University of Memphis"
];

export default function UniversityAutocomplete({ value, onChange, placeholder = "University" }){
  const [filtered, setFiltered] = useState([]);
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
    const term = (value || '').trim().toLowerCase();
    if (term.length > 0) {
      // Preserve original order by filtering, not sorting
      const suggestions = UNIVERSITY_LIST.filter(u => u.toLowerCase().includes(term)).slice(0, 12);
      setFiltered(suggestions);
      setShowDropdown(suggestions.length > 0);
      setSelectedIndex(-1);
    } else {
      setFiltered([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  }, [value]);

  const handleKeyDown = (e) => {
    if (!showDropdown || filtered.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < filtered.length) {
          e.preventDefault();
          select(filtered[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const select = (university) => {
    if (onChange) onChange({ target: { value: university } });
    setShowDropdown(false);
    setSelectedIndex(-1);
    if (inputRef.current) inputRef.current.focus();
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
      {showDropdown && filtered.length > 0 && (
        <div
          className="position-absolute w-100 bg-white border rounded shadow-sm mt-1"
          style={{ maxHeight: '250px', overflowY: 'auto', zIndex: 1000 }}
        >
          {filtered.map((u, idx) => (
            <div
              key={`${u}-${idx}`}
              className={`px-3 py-2 ${idx === selectedIndex ? 'bg-primary text-white' : ''}`}
              style={{ cursor: 'pointer', backgroundColor: idx === selectedIndex ? '#6366f1' : 'transparent' }}
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => select(u)}
            >
              {u}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
