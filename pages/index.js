import Link from 'next/link';
import Image from 'next/image';
import Layout from '../components/Layout';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Users, 
  Building, 
  TrendingUp, 
  Heart, 
  Target,
  CheckCircle,
  Briefcase,
  UserPlus,
  DollarSign,
  Star,
  ChevronDown,
  Eye,
  Fingerprint,
  BarChart3,
  Activity,
  MousePointerClick
} from 'lucide-react';
import { useState } from 'react';

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home(){
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <motion.section 
        className="text-center py-5 mb-5"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp}>
          <h1 className="display-4 fw-bold mb-3" style={{color: '#6366f1'}}>
            ELEV8R
          </h1>
          <h2 className="display-6 mb-4">Elevating into the right hire</h2>
          <p className="lead text-muted mb-5 mx-auto" style={{maxWidth: '600px'}}>
            Revolutionary hiring platform that connects top talent with great companies through intuitive filter-style matching.
          </p>
        </motion.div>

        <motion.div className="d-flex gap-3 justify-content-center flex-wrap mb-5" variants={fadeInUp}>
          <Link href="/seeker/login">
            <motion.button
              className="btn btn-primary btn-lg px-4 py-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Users className="me-2" size={20} />
              Find Jobs
            </motion.button>
          </Link>
          <Link href="/poster/login">
            <motion.button
              className="btn btn-outline-primary btn-lg px-4 py-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Building className="me-2" size={20} />
              Post Jobs
            </motion.button>
          </Link>
        </motion.div>
      </motion.section>

      {/* Trust/Stats Section */}
      <motion.section 
        className="py-5 mb-5"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <motion.div className="row text-center mb-5" variants={fadeInUp}>
          <div className="col-md-4 mb-3">
            <div className="bg-primary text-white rounded-pill px-4 py-2 d-inline-block">
              <strong>1000+</strong> roles posted
            </div>
          </div>
          <div className="col-md-4 mb-3">
            <div className="bg-success text-white rounded-pill px-4 py-2 d-inline-block">
              <strong>500+</strong> companies
            </div>
          </div>
          <div className="col-md-4 mb-3">
            <div className="bg-warning text-white rounded-pill px-4 py-2 d-inline-block">
              <strong>10k+</strong> candidates
            </div>
          </div>
        </motion.div>

        <motion.div className="row align-items-center" variants={fadeInUp}>
          <div className="col-md-8">
            <div className="d-flex gap-3 justify-content-center flex-wrap mb-4">
              {/* Placeholder company logos */}
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-light rounded p-3" style={{width: '80px', height: '50px'}}>
                  <div className="bg-secondary rounded h-100 opacity-25"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-md-4">
            <blockquote className="text-center">
              <p className="mb-2">"ELEV8R is great Sweetie"</p>
              <footer className="d-flex align-items-center justify-content-center">
                <div className="bg-primary rounded-circle me-2" style={{width: '32px', height: '32px'}}></div>
                <small className="text-muted">-Mom</small>
              </footer>
            </blockquote>
          </div>
        </motion.div>
      </motion.section>

      {/* How It Works - Three Tenants */}
      <motion.section 
        className="py-5 mb-5"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <motion.div className="text-center mb-5" variants={fadeInUp}>
          <h2 className="display-6 mb-3">How ELEV8R Works</h2>
          <p className="text-muted">ELEV8R is designed to solve today's hiring challenges</p>
        </motion.div>

        <div className="row">
          {/* Simplicity */}
          <div className="col-lg-4 mb-4">
            <motion.div className="text-center h-100" variants={fadeInUp}>
              <div className="bg-primary bg-opacity-10 rounded-circle p-4 d-inline-flex mb-4">
                <Zap className="text-primary" size={48} />
              </div>
              <h3 className="h4 mb-3">Simplicity</h3>
              <p className="text-muted">
                We use AI to connect your profile with the right roles — no endless scrolling, no guesswork.
              </p>
            </motion.div>
          </div>

          {/* Transparency */}
          <div className="col-lg-4 mb-4">
            <motion.div className="text-center h-100" variants={fadeInUp}>
              <div className="bg-success bg-opacity-10 rounded-circle p-4 d-inline-flex mb-4">
                <Eye className="text-success" size={48} />
              </div>
              <h3 className="h4 mb-3">Transparency</h3>
              <p className="text-muted">
                You'll get quick notification when an employer views your profile with their decision — and we show the salary range up front, always.
              </p>
            </motion.div>
          </div>

          {/* Individualism */}
          <div className="col-lg-4 mb-4">
            <motion.div className="text-center h-100" variants={fadeInUp}>
              <div className="bg-warning bg-opacity-10 rounded-circle p-4 d-inline-flex mb-4">
                <Fingerprint className="text-warning" size={48} />
              </div>
              <h3 className="h4 mb-3">Individualism</h3>
              <p className="text-muted">
                Your video-profile tells your story. Choose how you present yourself. Be found for you, not a generic role.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Analytics Dashboard Preview */}
      <motion.section 
        className="py-5 mb-5"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <motion.div className="text-center mb-5" variants={fadeInUp}>
          <h2 className="display-6 mb-3">Market Insights</h2>
          <p className="text-muted">Discover what jobs, skills, and salaries are most prevalent in the market</p>
        </motion.div>

        <motion.div className="row" variants={staggerContainer}>
          {/* Top Metrics Cards */}
          <div className="col-md-4 mb-4">
            <motion.div 
              className="card h-100 border-0 shadow-sm"
              variants={fadeInUp}
              whileHover={{ scale: 1.02 }}
            >
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <p className="text-muted mb-1">Active Job Postings</p>
                    <h3 className="mb-0">1,247</h3>
                  </div>
                  <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                    <Briefcase className="text-primary" size={24} />
                  </div>
                </div>
                <div className="d-flex align-items-center text-success">
                  <TrendingUp size={16} className="me-1" />
                  <small>+18% from last month</small>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="col-md-4 mb-4">
            <motion.div 
              className="card h-100 border-0 shadow-sm"
              variants={fadeInUp}
              whileHover={{ scale: 1.02 }}
            >
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <p className="text-muted mb-1">Top Skill Demand</p>
                    <h3 className="mb-0">JavaScript</h3>
                  </div>
                  <div className="bg-success bg-opacity-10 rounded-circle p-3">
                    <Target className="text-success" size={24} />
                  </div>
                </div>
                <div className="d-flex align-items-center text-success">
                  <TrendingUp size={16} className="me-1" />
                  <small>Most requested skill</small>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="col-md-4 mb-4">
            <motion.div 
              className="card h-100 border-0 shadow-sm"
              variants={fadeInUp}
              whileHover={{ scale: 1.02 }}
            >
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <p className="text-muted mb-1">Avg. Salary Range</p>
                    <h3 className="mb-0">$85K</h3>
                  </div>
                  <div className="bg-warning bg-opacity-10 rounded-circle p-3">
                    <DollarSign className="text-warning" size={24} />
                  </div>
                </div>
                <div className="d-flex align-items-center text-success">
                  <TrendingUp size={16} className="me-1" />
                  <small>+5.3% from last year</small>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Main Chart Area */}
          <div className="col-12 mb-4">
            <motion.div 
              className="card border-0 shadow-sm"
              variants={fadeInUp}
            >
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="mb-0">Job Market Growth</h5>
                  <div className="d-flex gap-3">
                    <div className="d-flex align-items-center">
                      <div className="bg-primary rounded me-2" style={{width: '12px', height: '12px'}}></div>
                      <small className="text-muted">New Postings</small>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="bg-success rounded me-2" style={{width: '12px', height: '12px'}}></div>
                      <small className="text-muted">Salary Trends</small>
                    </div>
                  </div>
                </div>
                
                {/* Simulated Chart */}
                <div className="position-relative" style={{height: '250px'}}>
                  <div className="d-flex align-items-end justify-content-between h-100 gap-2">
                    {[45, 52, 48, 65, 70, 68, 75, 82, 78, 85, 90, 88].map((height, i) => (
                      <div key={i} className="d-flex flex-column align-items-center flex-grow-1">
                        <div className="w-100 position-relative" style={{height: '100%'}}>
                          <motion.div 
                            className="bg-primary bg-opacity-75 rounded-top position-absolute bottom-0 w-100"
                            initial={{ height: 0 }}
                            whileInView={{ height: `${height}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                          ></motion.div>
                        </div>
                        <small className="text-muted mt-2">
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Top Performing Items */}
          <div className="col-md-6 mb-4">
            <motion.div 
              className="card border-0 shadow-sm h-100"
              variants={fadeInUp}
            >
              <div className="card-body">
                <h5 className="mb-4">Most In-Demand Jobs</h5>
                <div className="d-flex flex-column gap-3">
                  {[
                    { title: "Senior Software Engineer", count: 243, salary: "$120K" },
                    { title: "Product Manager", count: 187, salary: "$110K" },
                    { title: "Data Scientist", count: 156, salary: "$115K" }
                  ].map((job, i) => (
                    <div key={i} className="d-flex justify-content-between align-items-center pb-3 border-bottom">
                      <div>
                        <p className="mb-1 fw-semibold">{job.title}</p>
                        <small className="text-muted">{job.count} open positions</small>
                      </div>
                      <div className="text-end">
                        <div className="badge bg-success">{job.salary}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          <div className="col-md-6 mb-4">
            <motion.div 
              className="card border-0 shadow-sm h-100"
              variants={fadeInUp}
            >
              <div className="card-body">
                <h5 className="mb-4">Top Skills in Demand</h5>
                <div className="d-flex flex-column gap-3">
                  {[
                    { name: "JavaScript", count: 542, growth: "+15%" },
                    { name: "Python", count: 498, growth: "+22%" },
                    { name: "React", count: 431, growth: "+18%" }
                  ].map((skill, i) => (
                    <div key={i} className="d-flex justify-content-between align-items-center pb-3 border-bottom">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary rounded-circle me-3" style={{width: '40px', height: '40px'}}></div>
                        <div>
                          <p className="mb-1 fw-semibold">{skill.name}</p>
                          <small className="text-muted">{skill.count} job postings</small>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="badge bg-success">{skill.growth}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div className="text-center mt-4" variants={fadeInUp}>
          <p className="text-muted mb-3">Get comprehensive market data to make informed career and hiring decisions</p>
          <Link href="/analytics">
            <motion.button 
              className="btn btn-primary btn-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <BarChart3 className="me-2" size={20} />
              View Full Dashboard
            </motion.button>
          </Link>
        </motion.div>
      </motion.section>

      {/* FAQ Section */}
      <motion.section 
        className="py-5 mb-5"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <motion.div className="text-center mb-5" variants={fadeInUp}>
          <h2 className="display-6 mb-3">Frequently Asked Questions</h2>
        </motion.div>

        <motion.div className="row justify-content-center" variants={fadeInUp}>
          <div className="col-lg-8">
            {[
              {
                question: "How does the filter matching work?",
                answer: "Our AI algorithm analyzes your profile, skills, and preferences to show you the most relevant opportunities. Filter through to show interest in the best matches."
              },
              {
                question: "Is ELEV8R free for job seekers?",
                answer: "Yes! Job seekers can create profiles, browse jobs, and apply for positions completely free. We only charge employers for posting jobs and accessing premium features."
              },
              {
                question: "How quickly can I start hiring?",
                answer: "You can post your first job and start receiving matches within minutes of signing up. Our streamlined process gets you connected with candidates fast."
              },
              {
                question: "What makes ELEV8R different from other job boards?",
                answer: "We focus on quality matches over quantity. Our filter-based interface eliminates irrelevant applications and connects you with genuinely interested candidates."
              }
            ].map((faq, i) => (
              <div key={i} className="mb-3">
                <div 
                  className="card cursor-pointer"
                  onClick={() => toggleFaq(i)}
                >
                  <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">{faq.question}</h6>
                    <motion.div
                      animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={20} />
                    </motion.div>
                  </div>
                  <motion.div
                    initial={false}
                    animate={{ height: openFaq === i ? 'auto' : 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="card-body">
                      <p className="text-muted mb-0">{faq.answer}</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="py-5 mb-5 text-center bg-primary bg-opacity-10 rounded-4"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <h2 className="display-6 mb-3">Ready to revolutionize your hiring?</h2>
        <p className="lead mb-4">Join thousands of companies and candidates already using ELEV8R</p>
        <div className="d-flex gap-3 justify-content-center flex-wrap">
          <Link href="/seeker/signup">
            <motion.button
              className="btn btn-primary btn-lg px-4 py-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              I'm Looking for Jobs
            </motion.button>
          </Link>
          <Link href="/poster/signup">
            <motion.button
              className="btn btn-light btn-lg px-4 py-3 border border-primary text-primary fw-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ backgroundColor: 'white' }}
            >
              I'm Hiring Talent
            </motion.button>
          </Link>
        </div>
      </motion.section>
    </Layout>
  )
}
