'use client';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Fan, Droplets, Thermometer, Sun, Zap, CloudRain } from 'lucide-react'; // Icon

// Kết nối tới Backend NestJS (Cổng 3000)
const socket = io('http://localhost:3000');

// Định nghĩa kiểu dữ liệu cho chuẩn TypeScript
interface SensorData {
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
  const [history, setHistory] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Lấy dữ liệu lịch sử khi mới vào trang
    fetch('http://localhost:3001/soil/history')
      .then((res) => res.json())
      .then((data) => {
        // Đảo ngược mảng để dữ liệu cũ bên trái, mới bên phải
        const formatted = data.reverse().map((item: any) => ({
          ...item,
          timeStr: new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute:'2-digit' })
        }));
        setHistory(formatted);
      });

    // 2. Lắng nghe trạng thái kết nối
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // 3. Lắng nghe dữ liệu Realtime (3 giây/lần)
    socket.on('live-data', (data: SensorData) => {
      setCurrent(data);
      
      // Cập nhật biểu đồ realtime
      setHistory((prev) => {
        const newItem = { 
          ...data, 
          timeStr: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute:'2-digit' }) 
        };
        // Giữ lại 20 điểm dữ liệu gần nhất để biểu đồ không bị dồn cục
        const newHistory = [...prev, newItem];
        if (newHistory.length > 20) newHistory.shift();
        return newHistory;
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('live-data');
    };
  }, []);

  // Component hiển thị thẻ trạng thái (Card)
  const StatusCard = ({ title, value, unit, icon, color, status }: any) => (
    <div className={`p-4 rounded-xl shadow-lg bg-white border-l-4 ${color} flex items-center justify-between`}>
      <div>
        <p className="text-gray-500 text-sm font-bold uppercase">{title}</p>
        <p className="text-3xl font-bold my-1">{value} <span className="text-sm text-gray-400">{unit}</span></p>
        {status !== undefined && (
          <span className={`text-xs font-bold px-2 py-1 rounded ${status === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {status === 1 ? 'ĐANG BẬT' : 'ĐANG TẮT'}
          </span>
        )}
      </div>
      <div className="p-3 bg-gray-50 rounded-full">{icon}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">🌱 Vườn thông minh nhưng ko thông minh</h1>
          <p className="text-gray-500">Hệ thống giám sát & điều khiển vườn thông minh</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm font-medium text-gray-600">{isConnected ? 'Đã kết nối Server' : 'Mất kết nối'}</span>
        </div>
      </div>

      {/* Phần hiển thị thông số cảm biến & Trạng thái thiết bị */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Nhiệt độ & Quạt */}
        <StatusCard 
          title="Nhiệt độ" 
          value={current?.temp || '--'} 
          unit="°C" 
          color="border-red-500"
          status={current?.fan}
          icon={<Thermometer className="text-red-500 w-8 h-8" />} 
        />

        {/* Độ ẩm KK & Phun sương */}
        <StatusCard 
          title="Độ ẩm KK" 
          value={current?.hum || '--'} 
          unit="%" 
          color="border-blue-400"
          status={current?.mist}
          icon={<CloudRain className="text-blue-400 w-8 h-8" />} 
        />

        {/* Độ ẩm Đất & Máy bơm */}
        <StatusCard 
          title="Độ ẩm Đất" 
          value={current?.soil || '--'} 
          unit="%" 
          color="border-blue-700"
          status={current?.pump}
          icon={<Droplets className="text-blue-700 w-8 h-8" />} 
        />

        {/* Ánh sáng & Đèn */}
        <StatusCard 
          title="Ánh sáng" 
          value={current?.light || '--'} 
          unit="Lux" 
          color="border-yellow-500"
          status={current?.lamp}
          icon={<Sun className="text-yellow-500 w-8 h-8" />} 
        />
      </div>

      {/* Phần Biểu đồ & Thông tin phụ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ lớn */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Biểu đồ biến thiên theo thời gian thực</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="timeStr" fontSize={12} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="temp" name="Nhiệt độ" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="hum" name="Độ ẩm KK" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="soil" name="Độ ẩm Đất" stroke="#1d4ed8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel thông tin phụ */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Thông tin hệ thống</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Giờ mô phỏng:</span>
              <span className="font-mono font-bold text-xl text-purple-600">{current?.hour || 0}h:00</span>
            </div>
            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
              <strong>Logic tự động:</strong>
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>Bơm bật khi Đất &lt; 70%</li>
                <li>Quạt bật khi Nhiệt &gt; 30°C</li>
                <li>Đèn bật khi Trời tối (19h-6h)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}