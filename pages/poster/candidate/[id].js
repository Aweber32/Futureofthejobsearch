import Layout from '../../../components/Layout';
import CandidateSwiper from '../../../components/CandidateSwiper';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function CandidateReviewPage(){
	const router = useRouter();
	const { id, positionId } = router.query;
	const [candidate, setCandidate] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(()=>{
		if (!id) return;
		let cancelled = false;
		async function load(){
			try{
				const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
				const res = await fetch(`${base}/api/seekers`);
				if (!res.ok){ if (!cancelled) setCandidate(null); return; }
				const data = await res.json();
				const list = Array.isArray(data) ? data : (data.seekers || data);
				// Filter out seekers with inactive profiles
				const activeSeekers = Array.isArray(list) ? list.filter(seeker => seeker.isProfileActive !== false) : [];
				const seeker = (activeSeekers || []).find(s => (s.id ?? s.Id)?.toString() === id.toString());
				if (!cancelled){
					if (seeker){
						const posNum = positionId ? (Array.isArray(positionId) ? parseInt(positionId[0],10) : parseInt(positionId,10)) : null;
						setCandidate({ ...seeker, _positionId: Number.isFinite(posNum) ? posNum : null });
					} else {
						setCandidate(null);
					}
				}
			}catch(e){ if (!cancelled) setCandidate(null); }
			finally{ if (!cancelled) setLoading(false); }
		}
		load();
		return ()=>{ cancelled = true; }
	},[id, positionId]);

	return (
		<Layout title="Review candidate">
			<h2>Review candidate</h2>
			{loading ? (
				<div className="text-center">Loading…</div>
			) : !candidate ? (
				<div className="alert alert-secondary">Candidate not found.</div>
			) : (
				<CandidateSwiper initialCandidates={[candidate]} />
			)}
		</Layout>
	)
}
