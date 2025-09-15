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
  ChevronDown
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
              <p className="mb-2">"ELEV8R transformed our hiring process completely."</p>
              <footer className="d-flex align-items-center justify-content-center">
                <div className="bg-primary rounded-circle me-2" style={{width: '32px', height: '32px'}}></div>
                <small className="text-muted">Sarah Chen, HR Director</small>
              </footer>
            </blockquote>
          </div>
        </motion.div>
      </motion.section>

      {/* How It Works */}
      <motion.section 
        className="py-5 mb-5"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <motion.div className="text-center mb-5" variants={fadeInUp}>
          <h2 className="display-6 mb-3">How ELEV8R Works</h2>
          <p className="text-muted">Simple steps for both job seekers and employers</p>
        </motion.div>

        <div className="row">
          <div className="col-lg-6 mb-5">
            <motion.div variants={fadeInUp}>
              <h3 className="h4 mb-4 text-center">
                <Users className="me-2 text-primary" />
                For Job Seekers
              </h3>
              <div className="row">
                {[
                  { icon: UserPlus, title: "Create Profile", desc: "Build your professional profile in minutes" },
                  { icon: Heart, title: "Filter & Match", desc: "Filter through curated job opportunities" },
                  { icon: Target, title: "Quick Feedback", desc: "Learn quickly if the Employer is interested" }
                ].map((step, i) => (
                  <div key={i} className="col-12 mb-3">
                    <div className="d-flex align-items-start">
                      <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                        <step.icon className="text-primary" size={24} />
                      </div>
                      <div>
                        <h5 className="mb-2">{step.title}</h5>
                        <p className="text-muted mb-0">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="col-lg-6 mb-5">
            <motion.div variants={fadeInUp}>
              <h3 className="h4 mb-4 text-center">
                <Building className="me-2 text-success" />
                For Employers
              </h3>
              <div className="row">
                {[
                  { icon: Briefcase, title: "Post Jobs", desc: "Create compelling job postings with ease" },
                  { icon: Target, title: "Smart Matching", desc: "AI matches you with qualified candidates" },
                  { icon: CheckCircle, title: "Hire Faster", desc: "Seamlessly connect with top candidates to move forward" }
                ].map((step, i) => (
                  <div key={i} className="col-12 mb-3">
                    <div className="d-flex align-items-start">
                      <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                        <step.icon className="text-success" size={24} />
                      </div>
                      <div>
                        <h5 className="mb-2">{step.title}</h5>
                        <p className="text-muted mb-0">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Pricing Section */}
      <motion.section 
        className="py-5 mb-5"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <motion.div className="text-center mb-5" variants={fadeInUp}>
          <h2 className="display-6 mb-3">Simple Pricing</h2>
          <p className="text-muted">Choose the plan that fits your needs</p>
        </motion.div>

        <motion.div className="row" variants={staggerContainer}>
          {[
            { 
              name: "Starter", 
              price: "$29", 
              period: "/month", 
              features: ["5 job posts", "Basic matching", "Email support"],
              highlighted: false 
            },
            { 
              name: "Growth", 
              price: "$99", 
              period: "/month", 
              features: ["25 job posts", "Advanced matching", "Priority support", "Analytics"],
              highlighted: true 
            },
            { 
              name: "Scale", 
              price: "$199", 
              period: "/month", 
              features: ["Unlimited posts", "AI-powered insights", "Dedicated manager", "Custom branding"],
              highlighted: false 
            }
          ].map((plan, i) => (
            <div key={i} className="col-lg-4 mb-4">
              <motion.div 
                className={`card h-100 ${plan.highlighted ? 'border-primary shadow-lg' : ''}`}
                variants={fadeInUp}
                whileHover={{ scale: 1.02 }}
              >
                {plan.highlighted && (
                  <div className="badge bg-primary position-absolute top-0 start-50 translate-middle px-3 py-2">
                    Most Popular
                  </div>
                )}
                <div className="card-body text-center p-4">
                  <h4 className="card-title">{plan.name}</h4>
                  <div className="mb-4">
                    <span className="display-6 fw-bold">{plan.price}</span>
                    <span className="text-muted">{plan.period}</span>
                  </div>
                  <ul className="list-unstyled mb-4">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="mb-2">
                        <CheckCircle className="text-success me-2" size={16} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <motion.button 
                    className={`btn w-100 ${plan.highlighted ? 'btn-primary' : 'btn-outline-primary'}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Get Started
                  </motion.button>
                </div>
              </motion.div>
            </div>
          ))}
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
