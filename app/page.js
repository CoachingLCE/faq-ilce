import Link from 'next/link';

export const metadata = { title: 'Preguntas frecuentes | Instituto ILCE' };

export default function Inicio() {
  return (
    <div className="faqp">
      <div className="inicio">
        <div className="blink-pill"><span className="blink-dot" />Instituto de Enseñanza a Distancia</div>
        <h1 className="faq-title">Preguntas frecuentes de <em>ILCE</em></h1>
        <p className="faq-subtitle">Elegí la opción que mejor te describe y encontrá tu respuesta.</p>
        <div className="inicio-cards">
          <Link href="/estudiantes" className="inicio-card">
            <h2>Soy estudiante</h2>
            <p>Campus, clases grabadas, material, diploma, pagos y comunidad.</p>
            <span>Ver preguntas de estudiantes →</span>
          </Link>
          <Link href="/interesados" className="inicio-card">
            <h2>Quiero conocer ILCE</h2>
            <p>Cómo funcionan los cursos, certificaciones, duración, medios de pago e inscripción.</p>
            <span>Ver preguntas para interesados →</span>
          </Link>
        </div>
        <p className="inicio-equipo"><Link href="/panel/login">Acceso del equipo</Link></p>
      </div>
    </div>
  );
}
