import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Generate a PDF from a DOM element with the `.printable-card` class,
 * then share it via WhatsApp using the Web Share API (mobile/desktop).
 * Falls back to downloading the PDF + opening WhatsApp text if Web Share is unsupported.
 */
export async function generateAndSharePDF(options: {
  fileName: string;
  phone?: string;
  message: string;
}) {
  const { fileName, phone, message } = options;

  const cardEl = document.querySelector(".printable-card") as HTMLElement;
  if (!cardEl) {
    alert("Could not find the printable card to generate PDF.");
    return;
  }

  // Capture the printable card as a high-res canvas
  const canvas = await html2canvas(cardEl, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  // Convert canvas to A4 PDF
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth - 16; // 8mm margin each side
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let yOffset = 8;
  let remainingHeight = imgHeight;

  // First page
  pdf.addImage(imgData, "PNG", 8, yOffset, imgWidth, imgHeight);
  remainingHeight -= (pdfHeight - 16);

  // Add pages if content overflows
  while (remainingHeight > 0) {
    pdf.addPage();
    yOffset = -(imgHeight - remainingHeight) + 8;
    pdf.addImage(imgData, "PNG", 8, yOffset, imgWidth, imgHeight);
    remainingHeight -= (pdfHeight - 16);
  }

  const pdfBlob = pdf.output("blob");
  const pdfFile = new File([pdfBlob], `${fileName}.pdf`, { type: "application/pdf" });

  // Try Web Share API (works on mobile + modern desktop)
  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        title: fileName,
        text: message,
        files: [pdfFile],
      });
      return; // Successfully shared
    } catch (err: any) {
      // User cancelled or share failed — fall through to fallback
      if (err?.name === "AbortError") return;
    }
  }

  // Fallback: Download the PDF and open WhatsApp with text message
  const downloadUrl = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `${fileName}.pdf`;
  a.click();
  URL.revokeObjectURL(downloadUrl);

  // Open WhatsApp with just the text
  const encodedMsg = encodeURIComponent(message + "\n\n📎 PDF downloaded — please attach it manually.");
  const cleanPhone = phone?.replace(/\D/g, "") || "";
  const waUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone}&text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;
  window.open(waUrl, "_blank");
}
