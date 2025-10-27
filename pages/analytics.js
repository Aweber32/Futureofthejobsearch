import Layout from '../components/Layout';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Eye, Activity } from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

export default function Analytics() {
  return (
    <Layout>
      <motion.div 
        className="d-flex flex-column align-items-center justify-content-center text-center"
        style={{ minHeight: '70vh' }}
        initial="initial"
        animate="animate"
        variants={fadeInUp}
      >
        <motion.div 
          className="mb-4"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
        >
          <BarChart3 size={120} className="text-primary" />
        </motion.div>

        <h1 className="display-3 fw-bold mb-3">Coming Soon</h1>
        <p className="lead text-muted mb-4" style={{ maxWidth: '600px' }}>
          We're building an amazing analytics dashboard to help you discover the most prevalent 
          jobs, in-demand skills, and competitive salary ranges in the market.
        </p>

        <div className="row g-4 mb-5" style={{ maxWidth: '800px' }}>
          <div className="col-md-4">
            <motion.div 
              className="bg-primary bg-opacity-10 rounded-circle p-4 d-inline-flex mb-3"
              whileHover={{ scale: 1.1 }}
            >
              <Eye className="text-primary" size={40} />
            </motion.div>
            <h5>Top Jobs</h5>
            <p className="text-muted small">See which positions are most in-demand right now</p>
          </div>

          <div className="col-md-4">
            <motion.div 
              className="bg-success bg-opacity-10 rounded-circle p-4 d-inline-flex mb-3"
              whileHover={{ scale: 1.1 }}
            >
              <Activity className="text-success" size={40} />
            </motion.div>
            <h5>Popular Skills</h5>
            <p className="text-muted small">Discover the most sought-after skills by employers</p>
          </div>

          <div className="col-md-4">
            <motion.div 
              className="bg-warning bg-opacity-10 rounded-circle p-4 d-inline-flex mb-3"
              whileHover={{ scale: 1.1 }}
            >
              <TrendingUp className="text-warning" size={40} />
            </motion.div>
            <h5>Salary Trends</h5>
            <p className="text-muted small">Understand competitive salary ranges across roles</p>
          </div>
        </div>

        <motion.div
          className="bg-primary bg-opacity-10 rounded-4 p-4"
          whileHover={{ scale: 1.02 }}
        >
          <p className="mb-2 fw-semibold text-primary">Want early access?</p>
          <p className="text-muted small mb-0">
            Stay tuned! This feature will be available soon to all ELEV8R users.
          </p>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
