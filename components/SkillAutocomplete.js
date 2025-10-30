import { useState, useEffect, useRef } from 'react';

const SKILLS_LIST = [
  "Adaptability",
  "Administrative Skills",
  "Agile Methodologies",
  "Analytical Thinking",
  "Attention to Detail",
  "Automation",
  "Big Data Analytics",
  "Budgeting",
  "Business Acumen",
  "Business Analysis",
  "Business Development",
  "Business Intelligence",
  "Change Management",
  "Cloud Computing",
  "Collaboration",
  "Communication (Written)",
  "Communication (Verbal)",
  "Compliance",
  "Conflict Resolution",
  "Continuous Improvement",
  "Creativity",
  "Critical Thinking",
  "Customer Service",
  "Cybersecurity Awareness",
  "Data Analysis",
  "Data Governance",
  "Data Integration",
  "Data Literacy",
  "Data Modeling",
  "Database Administration",
  "Decision-Making",
  "Digital Literacy",
  "Diversity & Inclusion",
  "Document Management",
  "E-commerce",
  "Editing & Proofreading",
  "Emotional Intelligence",
  "Employee Engagement",
  "Enterprise Architecture",
  "Event Planning",
  "Financial Analysis",
  "Financial Modeling",
  "Forecasting",
  "Front-end Development",
  "Governance",
  "Graphic Design",
  "Human Resources Management",
  "Implementation Planning",
  "Incident Management",
  "Influencing Others",
  "Information Security",
  "Infrastructure Management",
  "Innovation",
  "Internet of Things (IoT) Awareness",
  "Java Programming",
  "Job Coaching",
  "Key Stakeholder Management",
  "Knowledge Management",
  "Kubernetes / Containerization",
  "Leadership",
  "Lean Methodologies",
  "Legal Compliance",
  "Logistics & Supply Chain",
  "Machine Learning Basics",
  "Management Skills",
  "Marketing Strategy",
  "Microsoft Excel Proficiency",
  "Mobile App Development",
  "Negotiation",
  "Network Administration",
  "New Product Development",
  "Office Suite Proficiency",
  "Organizational Skills",
  "Outsourcing Management",
  "Performance Management",
  "Persuasion",
  "Planning & Scheduling",
  "Presentation Skills",
  "Process Improvement",
  "Product Management",
  "Project Management",
  "Programming (General)",
  "Python Programming",
  "Quality Assurance",
  "Quantitative Analysis",
  "React / Angular / Vue Frameworks",
  "Recruitment & Talent Acquisition",
  "Requirements Gathering",
  "Resilience",
  "Risk Management",
  "Roadmap Development",
  "Sales Strategy",
  "Scrum / Agile Frameworks",
  "Search Engine Optimization (SEO)",
  "Security Architecture",
  "Service Orientation",
  "Shift Management",
  "Six Sigma / DMAIC",
  "Social Media Management",
  "Software Architecture",
  "Software Development Lifecycle (SDLC)",
  "Solution Architecture",
  "Stakeholder Communication",
  "Statistical Analysis",
  "Strategic Planning",
  "Strong Work Ethic",
  "Stress Management",
  "Supply Chain Optimization",
  "Systems Thinking",
  "Technical Documentation",
  "Technical Leadership",
  "Technical Support",
  "Time Management",
  "Troubleshooting",
  "UX/UI Design",
  "Vendor Management",
  "Version Control (Git)",
  "Virtual Collaboration",
  "Web Development",
  "Written Communication",
  "Yield Management",
  "Zero-Defect Mindset",
  "Agile Testing",
  "API Development",
  "Business Continuity Planning",
  "Client Relationship Management",
  "Cloud Migration",
  "Competitive Analysis",
  "Conflict Management",
  "Corporate Governance",
  "CRM Systems (Customer Relationship Management)",
  "Data Warehousing",
  "DevOps Practices",
  "Digital Marketing",
  "Disaster Recovery Planning",
  "Embedded Systems Basics",
  "Ethical Decision-Making",
  "Forecasting & Budgeting",
  "Gamification Awareness",
  "Geographic Information Systems (GIS) Basics",
  "Human-Computer Interaction Awareness",
  "Incident Response",
  "Interactive Dashboards",
  "IT Governance",
  "JavaScript Programming",
  "Legal Risk Management",
  "Machine Vision Awareness",
  "Market Research",
  "Middleware Integration",
  "Object-Oriented Programming",
  "Process Automation",
  "Public Speaking",
  "Real-Time Data Streaming Awareness",
  "Red Teaming (Security Awareness)",
  "Regulatory Affairs",
  "Relational Database Design",
  "Regression Analysis",
  "Reliability Engineering Basics",
  "Roadmapping & Vision",
  "Scaling Systems Awareness",
  "Scalable Architecture Awareness",
  "Simulation Modeling Awareness",
  "Software as a Service (SaaS) Awareness",
  "Supply Chain Resilience",
  "Technical Debt Management Awareness",
  "Telemetry & Observability Awareness",
  "Threat Modeling Awareness",
  "Video Production / Editing",
  "Workforce Planning",
  "Zero-Trust Security Architecture Awareness",
  "Edge Computing Awareness",
  "Augmented Reality (AR) / Virtual Reality (VR) Awareness",
  "Blockchain Development Awareness",
  "Conversational AI / Chatbots Awareness",
  "Ethical AI Design Awareness",
  "Generative AI Applications Awareness",
  "Prompt Engineering Basics",
  "Cloud-Native Infrastructure Awareness",
  "Multicloud Management Awareness",
  "Data Mesh Architecture Awareness",
  "Data Fabric Design Awareness",
  "Federated Learning Awareness",
  "Quantum Computing Basics",
  "Sustainability Strategy Awareness",
  "Circular Economy Knowledge",
  "Climate Risk Assessment Awareness",
  "ESG (Environmental, Social & Governance) Reporting Awareness",
  "Digital Twin Modeling Awareness",
  "Digital Ethics Awareness",
  "Decentralized Finance (DeFi) Frameworks Awareness",
  "Robotic Process Automation (RPA) Awareness",
  "Human-Robot Interaction Awareness",
  "Bioinformatics Basics",
  "Adaptive Leadership",
  "Analytical/Quantitative Skills",
  "Coaching & Mentoring",
  "Cognitive Flexibility",
  "Conflict Coaching",
  "Cross-Functional Collaboration",
  "Curiosity & Learning Agility",
  "Customer-Centric Thinking",
  "Data-Driven Decision Making",
  "Design Thinking",
  "Empathy",
  "Ethical Leadership",
  "Facilitation Skills",
  "Global Mindset",
  "Growth Mindset",
  "Influential Communication",
  "Information Management",
  "Insight Generation",
  "Integrated Thinking",
  "Learning Management",
  "Metrics & KPI Management",
  "Monitoring & Evaluation",
  "Multi-tasking",
  "Negotiation & Persuasion",
  "Organizational Change Management",
  "Partnership Building",
  "Performance Metrics & Analysis",
  "Portfolio Management",
  "Process Mapping",
  "Professionalism",
  "Project Prioritization",
  "Quality Management",
  "Reflective Practice",
  "Relationship Building",
  "Reskilling & Upskilling",
  "Risk & Compliance Awareness",
  "Scenario Planning",
  "Service Design",
  "Social Intelligence",
  "Stakeholder Management",
  "Strategic Alignment",
  "Supplier Relationship Management",
  "Talent Development",
  "Technical Strategy",
  "Time & Priority Allocation",
  "Transformation Leadership",
  "Value Creation",
  "Vision & Strategic Thinking",
  "Workflow Optimization",
  "Work Planning",
  "Workplace Safety Awareness",
  "Writing for Digital Media",
  "Adaptive Thinking",
  "Business Process Re-engineering",
  "Cross-Cultural Communication",
  "Digital Transformation Strategy",
  "Ecosystem Thinking",
  "Ethical Decision Frameworks",
  "Financial Reporting",
  "Hybrid / Remote Collaboration",
  "Innovation Management",
  "Knowledge Sharing",
  "Organizational Behaviour Awareness",
  "Performance Optimization",
  "Post-Merger Integration Awareness",
  "Program Management",
  "Scalable Growth Strategy",
  "Service Level Agreement (SLA) Management",
  "Stakeholder Engagement",
  "Strategic Forecasting",
  "Talent Acquisition Strategy",
  "Technology Roadmap Planning",
  "Transparent Communication",
  "User Experience Strategy",
  "Value Stream Mapping",
  "Virtual Team Leadership",
  "Workforce Diversity Strategy",
  "Analytics & Insight Generation",
  "Business Model Innovation",
  "Customer Journey Mapping",
  "Digital Ecosystems Awareness",
  "Emotional Resilience",
  "Ethical Supply Chain Awareness",
  "Future-Proofing Skills",
  "Green Technology Awareness",
  "Hyper-automation Awareness",
  "Inclusive Leadership",
  "Intelligent Automation Awareness",
  "Microservices Architecture Awareness",
  "Network Resilience Awareness",
  "Platform Strategy Awareness",
  "Scenario Analysis",
  "Service Innovation",
  "Smart Data Strategy",
  "Strategic Portfolio Management",
  "Sustainable Business Practices",
  "Technology Adoption Strategy",
  "Virtual Reality / Augmented Reality Strategy",
  "Workforce Analytics Awareness",
  "Zero-Waste Strategy Awareness",
  "Advanced Data Analytics Awareness",
  "Continuous Delivery / Continuous Integration (CI/CD) Awareness",
  "Customer Success Management",
  "Digital Accessibility Awareness",
  "Employee Advocacy",
  "Organizational Agility Awareness",
  "Stakeholder Value Management"
];

export default function SkillAutocomplete({ value, onChange, onAdd, placeholder = "Add skill and press Add" }) {
  const [filteredSkills, setFilteredSkills] = useState([]);
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
      const filtered = SKILLS_LIST.filter(skill => 
        skill.toLowerCase().includes(searchTerm)
      ).slice(0, 10); // Limit to 10 suggestions
      setFilteredSkills(filtered);
      setShowDropdown(filtered.length > 0);
      setSelectedIndex(-1);
    } else {
      setFilteredSkills([]);
      setShowDropdown(false);
    }
  }, [value]);

  const handleKeyDown = (e) => {
    if (!showDropdown || filteredSkills.length === 0) {
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
          prev < filteredSkills.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredSkills.length) {
          selectSkill(filteredSkills[selectedIndex]);
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

  const selectSkill = (skill) => {
    onChange({ target: { value: skill } });
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
      {showDropdown && filteredSkills.length > 0 && (
        <div 
          className="position-absolute w-100 bg-white border rounded shadow-sm mt-1" 
          style={{ 
            maxHeight: '250px', 
            overflowY: 'auto', 
            zIndex: 1000 
          }}
        >
          {filteredSkills.map((skill, index) => (
            <div
              key={skill}
              className={`px-3 py-2 cursor-pointer ${
                index === selectedIndex ? 'bg-primary text-white' : 'hover-bg-light'
              }`}
              style={{ 
                cursor: 'pointer',
                backgroundColor: index === selectedIndex ? '#6366f1' : 'transparent'
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => selectSkill(skill)}
            >
              {skill}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
