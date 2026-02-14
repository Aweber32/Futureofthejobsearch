export default function Footer(){
  return (
    <footer className="py-5 mt-5 border-top">
      <div className="container">
        <div className="row">
          <div className="col-md-6 mb-3 mb-md-0">
            <h5 className="fw-bold text-primary">Proslipsi</h5>
            <p className="text-muted small mb-0">Elevating into the right hire</p>
          </div>
          <div className="col-md-6">
            <div className="row">
              <div className="col-6">
                <ul className="list-unstyled small">
                  <li><a href="#" className="text-muted text-decoration-none">Contact</a></li>
                  <li><a href="#" className="text-muted text-decoration-none">About</a></li>
                  <li><a href="#" className="text-muted text-decoration-none">Careers</a></li>
                </ul>
              </div>
              <div className="col-6">
                <ul className="list-unstyled small">
                  <li><a href="#" className="text-muted text-decoration-none">Privacy</a></li>
                  <li><a href="#" className="text-muted text-decoration-none">Terms</a></li>
                  <li><a href="#" className="text-muted text-decoration-none">Status</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <hr className="my-4" />
        <div className="text-center text-muted small">
          © {new Date().getFullYear()} Proslipsi. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
