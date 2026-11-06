import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', background: '#090d16', color: '#fff', height: '100vh' }}>
      <h2>404 - Page Not Found</h2>
      <p>The NASCAR Trail Racer 500 page you requested could not be found.</p>
      <Link href="/" style={{ color: '#facc15', textDecoration: 'underline' }}>Return to Garage</Link>
    </div>
  );
}
