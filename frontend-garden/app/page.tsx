'use client';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Fan, Droplets, Thermometer, Sun, CloudRain, Download, FileText, Music } from 'lucide-react'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Kết nối tới Backend
const socket = io('http://localhost:3001');

interface SensorData {
  id?: number;
  temp: number;
  hum: number;
  soil: number;
  light: number;
  hour: number;
  fan: number;
  pump: number;
  mist: number;
  lamp: number;
  createdAt?: string;
}

export default function Home() {
  const [current, setCurrent] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showPdfConfirm, setShowPdfConfirm] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/soil/history')
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.reverse().map((item: any) => ({
          ...item,
          timeStr: new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute:'2-digit' })
        }));
        setHistory(formatted);
      })
      .catch(err => console.error("Lỗi fetch:", err));

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('live-data', (data: SensorData) => {
      setCurrent(data);
      setHistory((prev) => {
        const newItem = { 
          ...data, 
          timeStr: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute:'2-digit' }) 
        };
        const newHistory = [...prev, newItem];
        if (newHistory.length > 20) newHistory.shift();
        return newHistory;
      });
    });

    return () => { socket.off('connect'); socket.off('disconnect'); socket.off('live-data'); };
  }, []);

  const handleExportCSV = async () => {
     try {
      const res = await fetch('http://localhost:3001/soil/all');
      const data = await res.json();
      if (!data || data.length === 0) { alert("Chưa có dữ liệu!"); return; }
      const headers = ["ID,Thoi gian,Nhiet do,Do am KK,Dat,Anh sang,Quat,Suong,Bom,Den"];
      const rows = data.map((item: any) => {
        const time = new Date(item.createdAt).toLocaleString('vi-VN');
        return `${item.id},"${time}",${item.temp},${item.hum},${item.soil},${item.light},${item.fan},${item.mist},${item.pump},${item.lamp}`;
      });
      const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Bao_cao_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (error) { alert("Lỗi tải file!"); }
  };

  const openPdfConfirm = () => setShowPdfConfirm(true);

  const executeExportPDF = async () => {
    setShowPdfConfirm(false);
    try {
      const res = await fetch('http://localhost:3001/soil/all');
      const data = await res.json();
      if (!data || data.length === 0) { alert("Chưa có dữ liệu!"); return; }
      const doc = new jsPDF();
      doc.setFontSize(16); doc.setTextColor(40); doc.text("BAO CAO DU LIEU SMART GARDEN", 14, 22);
      doc.setFontSize(10); doc.text(`Ngay xuat: ${new Date().toLocaleString('vi-VN')}`, 14, 30);
      const tableRows = data.map((item: any) => [
        item.id, new Date(item.createdAt).toLocaleTimeString('vi-VN'),
        item.temp, `${item.hum}%`, `${item.soil}%`, item.light,
        item.fan ? 'ON' : '-', item.mist ? 'ON' : '-', item.pump ? 'ON' : '-', item.lamp ? 'ON' : '-',
      ]);
      autoTable(doc, { head: [['ID', 'Gio', 'Temp', 'Hum', 'Soil', 'Light', 'Fan', 'Mist', 'Pump', 'Lamp']], body: tableRows, startY: 35, styles: { fontSize: 9, halign: 'center' }, headStyles: { fillColor: [22, 163, 74] } });
      doc.save(`Bao_cao_PDF_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (error) { alert("Lỗi tạo PDF!"); }
  };

  const StatusCard = ({ title, value, unit, icon, color, status }: any) => (
    <div className={`p-4 rounded-xl shadow-lg bg-white border-l-4 ${color} flex items-center justify-between transition-transform hover:scale-105`}>
      <div>
        <p className="text-gray-500 text-sm font-bold uppercase">{title}</p>
        <p className="text-3xl font-bold my-1">{value} <span className="text-sm text-gray-400">{unit}</span></p>
        {status !== undefined && <span className={`text-xs font-bold px-2 py-1 rounded ${status === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{status === 1 ? 'ĐANG BẬT' : 'ĐANG TẮT'}</span>}
      </div>
      <div className="p-3 bg-gray-50 rounded-full">{icon}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans relative">
      {/* POPUP CONFIRM */}
      {showPdfConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 text-center">
            <div className="mb-4"><img src="/warning.jpg" alt="Xác nhận" className="w-20 h-20 mx-auto object-contain drop-shadow-md"/></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Xuất nhé?</h3>
            <p className="text-gray-500 mb-6 text-sm">Bro muốn xuất toàn bộ không?</p>
            <div className="flex gap-3 w-full">
              <button onClick={() => setShowPdfConfirm(false)} className="flex-1 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors">Từ, kìm lại đã~~</button>
              <button onClick={executeExportPDF} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-red-200">Ok, Xuất!</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div><h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-2">🌱 Vườn thông minh</h1><p className="text-gray-500">Hệ thống giám sát & điều khiển IoT</p></div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow font-medium transition-colors"><Download size={18} /> <span className="hidden md:inline">Excel</span></button>
          <button onClick={openPdfConfirm} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow font-medium transition-colors"><FileText size={18} /> <span className="hidden md:inline">PDF</span></button>
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm ml-2"><span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span><span className="text-sm font-medium text-gray-600">{isConnected ? 'Online' : 'Offline'}</span></div>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatusCard title="Nhiệt độ" value={current?.temp || '--'} unit="°C" color="border-red-500" status={current?.fan} icon={<Thermometer className="text-red-500 w-8 h-8" />} />
        <StatusCard title="Độ ẩm KK" value={current?.hum || '--'} unit="%" color="border-blue-400" status={current?.mist} icon={<CloudRain className="text-blue-400 w-8 h-8" />} />
        <StatusCard title="Độ ẩm Đất" value={current?.soil || '--'} unit="%" color="border-blue-700" status={current?.pump} icon={<Droplets className="text-blue-700 w-8 h-8" />} />
        <StatusCard title="Ánh sáng" value={current?.light || '--'} unit="Lux" color="border-yellow-500" status={current?.lamp} icon={<Sun className="text-yellow-500 w-8 h-8" />} />
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CỘT TRÁI: BIỂU ĐỒ (LỚN) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg h-full">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Biểu đồ biến thiên</h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="timeStr" fontSize={12} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="temp" name="Nhiệt độ" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="hum" name="Độ ẩm KK" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="soil" name="Độ ẩm Đất" stroke="#1d4ed8" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CỘT PHẢI: THÔNG TIN + NHẠC */}
        <div className="flex flex-col gap-4"> 
          
          {/* 1. THÔNG TIN HỆ THỐNG (ĐÃ THU GỌN) */}
          <div className="bg-white p-4 rounded-xl shadow-lg">
            <h3 className="text-md font-bold text-gray-700 mb-3">Thông tin hệ thống</h3>
            <div className="space-y-2">
              {/* Giờ mô phỏng */}
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Giờ mô phỏng:</span>
                <span className="font-mono font-bold text-lg text-purple-600">{current?.hour || 0}h:00</span>
              </div>
              {/* Logic tự động (Font chữ nhỏ hơn) */}
              <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-xs">
                <strong>Logic tự động:</strong>
                <ul className="list-disc ml-4 mt-1 space-y-0.5">
                  <li>Bơm bật khi Đất &lt; 70%</li>
                  <li>Quạt bật khi Nhiệt &gt; 30°C</li>
                  <li>Đèn bật khi Trời tối (19h-6h)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 2. TRÌNH PHÁT NHẠC (COMPACT) */}
          {/* 2. TRÌNH PHÁT NHẠC (Playlist YouTube) */}
          <div className="bg-white p-4 rounded-xl shadow-lg flex-1 flex flex-col">
             <div className="flex items-center gap-2 mb-2">
                <Music className="text-red-600 w-5 h-5" /> 
                <h3 className="text-md font-bold text-gray-700">Box nhạc</h3>
             </div>
             
             <div className="flex-1 rounded-xl overflow-hidden relative">
               <iframe 
                 className="absolute top-0 left-0 w-full h-full"
                 style={{ borderRadius: '12px' }} 
                 // 👇 ĐỔI LINK Ở ĐÂY: Dùng 'videoseries?list=' để phát Playlist
                 src="https://www.youtube.com/embed/videoseries?list=RDEMr5PADHxmLsSDBfrwaCS7fQ" 
                 title="Nhạc K-pop"
                 frameBorder="0" 
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                 allowFullScreen
               />
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}