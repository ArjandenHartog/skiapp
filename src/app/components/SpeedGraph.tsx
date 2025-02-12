"use client";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SpeedGraphProps {
  data: number[];
  labels: string[];
}

export default function SpeedGraph({ data, labels }: SpeedGraphProps) {
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Snelheid (km/u)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Tijd'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    }
  };

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Snelheid',
        data: data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  return (
    <div className="w-full h-[200px] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4">
      <Line options={options} data={chartData} />
    </div>
  );
}