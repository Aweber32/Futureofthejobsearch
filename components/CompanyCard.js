export default function CompanyCard({ company = {} }){
  const { name = 'Acme Co', logo = '/logo.svg' } = company;
  return (
    <div className="d-flex align-items-center">
      <img src={logo} alt="logo" width={64} height={64} className="me-3" />
      <div>
        <div className="h5 mb-0">{name}</div>
        <small className="text-muted">Company profile</small>
      </div>
    </div>
  )
}
