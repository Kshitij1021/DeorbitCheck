import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFReportData {
  missionName: string;
  altitudeKm: number;
  inclinationDeg: number;
  massKg: number;
  areaM2: number;
  cd: number;
  ballisticTerm: number;
  launchYear: number;
  lifetimes: {
    low: number;
    medium: number;
    high: number;
  };
  verdict: string;
  rules: { name: string; limitYears: number; status: string }[];
  recommendations: {
    maxPassingAlt: number;
    requiredArea: number;
    extraAreaNeeded: number;
    minLimitYears: number;
  } | null;
  chartElementId: string;
}

export async function generatePDFReport(data: PDFReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Background Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Title
  doc.setTextColor(45, 212, 191); // teal-400
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DeorbitCheck', 14, 16);

  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Orbital Lifetime & Space Debris Mitigation Compliance Report', 14, 23);

  // Timestamp
  const nowStr = new Date().toLocaleString();
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${nowStr}`, pageWidth - 14, 23, { align: 'right' });

  let y = 43;

  // Verdict Section
  const verdictColor: [number, number, number] =
    data.verdict === 'PASS'
      ? [16, 185, 129]
      : data.verdict === 'BORDERLINE'
      ? [245, 158, 11]
      : [239, 68, 68];

  doc.setFillColor(...verdictColor);
  doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const verdictText = `COMPLIANCE VERDICT: ${data.verdict} ${
    data.missionName ? `(${data.missionName})` : ''
  }`;
  doc.text(verdictText, 18, y + 9);

  y += 20;

  // Two column layout: Satellite inputs & Scenario Lifetimes
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Mission & Satellite Parameters', 14, y);
  doc.text('2. Estimated Orbital Lifetimes', pageWidth / 2 + 5, y);

  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const leftParams = [
    `Initial Altitude: ${data.altitudeKm} km`,
    `Inclination: ${data.inclinationDeg}°`,
    `Satellite Mass: ${data.massKg} kg`,
    `Cross-Sectional Drag Area: ${data.areaM2} m²`,
    `Aerodynamic Drag Coeff (Cd): ${data.cd}`,
    `Ballistic Term (B = Cd*A/m): ${data.ballisticTerm.toFixed(5)} m²/kg`,
    `Target Launch Year: ${data.launchYear}`,
  ];

  leftParams.forEach((line, i) => {
    doc.text(line, 14, y + i * 5);
  });

  const formatYr = (yr: number) => {
    if (yr >= 100) return '>100 years (orbital dwell)';
    if (yr < 1) return `${Math.round(yr * 12)} months (${yr.toFixed(2)} yr)`;
    return `${yr.toFixed(2)} years`;
  };

  const rightScenarios = [
    `Medium Baseline (1.0x Solar): ${formatYr(data.lifetimes.medium)}`,
    `Low Activity (0.4x Solar Minimum): ${formatYr(data.lifetimes.low)}`,
    `High Activity (3.0x Solar Maximum): ${formatYr(data.lifetimes.high)}`,
    '',
    'Atmosphere: Standard 28-layer piecewise exponential',
    'Re-entry Threshold: 120 km geocentric altitude',
  ];

  rightScenarios.forEach((line, i) => {
    if (i === 0) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');
    doc.text(line, pageWidth / 2 + 5, y + i * 5);
  });

  y += 42;

  // Capture Chart if element exists
  const chartEl = document.getElementById(data.chartElementId);
  if (chartEl) {
    try {
      const canvas = await html2canvas(chartEl, {
        scale: 2,
        backgroundColor: '#0f172a',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const chartWidth = pageWidth - 28;
      const chartHeight = 55;
      doc.addImage(imgData, 'PNG', 14, y, chartWidth, chartHeight);
      y += chartHeight + 8;
    } catch (e) {
      console.warn('Failed to snapshot chart for PDF', e);
      y += 5;
    }
  }

  // Compliance Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('3. Regulatory Compliance Matrix', 14, y);
  y += 5;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Debris Mitigation Standard', 18, y + 4.5);
  doc.text('Threshold Limit', 90, y + 4.5);
  doc.text('Compliance Status', 140, y + 4.5);

  y += 7;
  doc.setFont('helvetica', 'normal');
  data.rules.forEach((r) => {
    doc.setTextColor(30, 41, 59);
    doc.text(r.name, 18, y + 4.5);
    doc.text(`${r.limitYears} Years`, 90, y + 4.5);
    if (r.status === 'Pass') {
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
    } else if (r.status === 'Borderline') {
      doc.setTextColor(245, 158, 11);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(239, 68, 68);
      doc.setFont('helvetica', 'bold');
    }
    doc.text(r.status.toUpperCase(), 140, y + 4.5);
    doc.setFont('helvetica', 'normal');
    y += 6;
  });

  y += 4;

  // Recommendations if any
  if (data.recommendations) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('4. Recommended Mitigation Strategies', 14, y);
    y += 4.5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const recText1 = `• Orbit Modification: Inject at or below ${data.recommendations.maxPassingAlt} km to achieve natural deorbit within ${data.recommendations.minLimitYears} years.`;
    const recText2 = `• Drag Enhancement: Increase aerodynamic cross-section to ${data.recommendations.requiredArea} m² (requiring a +${data.recommendations.extraAreaNeeded} m² deployable drag sail).`;
    doc.text(recText1, 14, y);
    y += 4;
    doc.text(recText2, 14, y);
    y += 7;
  }

  // Footer Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const disclaimer =
    'Screening-level estimate for early design. Not an official certification. Verify rule thresholds against the official sources.';
  doc.text(disclaimer, pageWidth / 2, 285, { align: 'center' });

  // Save PDF
  const filename = data.missionName
    ? `DeorbitCheck_${data.missionName.replace(/\s+/g, '_')}.pdf`
    : `DeorbitCheck_Report_${data.altitudeKm}km.pdf`;
  doc.save(filename);
}
