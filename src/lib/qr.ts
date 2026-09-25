import QRCode from "qrcode";
export const QR_OPTIONS={errorCorrectionLevel:"H" as const,margin:2,width:768,color:{dark:"#11151c",light:"#ffffff"}};
export async function verificationQr(url:string){const parsed=new URL(url);if(parsed.protocol!=="https:"&&parsed.hostname!=="localhost")throw new Error("Invalid verification URL");return QRCode.toBuffer(parsed.toString(),{...QR_OPTIONS,type:"png"});}
