// app/page.tsx
import Link from "next/link";
import { ChevronRight, Car, Users, Calendar, BarChart } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LUANAR Fleet Management System',
  description: 'Smart fleet management solution for LUANAR',
};

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  bgColor: string;
  iconColor: string;
}

export default function Home() {
  const features: FeatureCard[] = [
    {
      icon: <Car className="w-6 h-6" />,
      title: "Vehicle Tracking",
      description: "Real-time location tracking and monitoring of your entire fleet",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Driver Management",
      description: "Complete driver profiles, assignments, and performance tracking",
      bgColor: "bg-indigo-100",
      iconColor: "text-indigo-600"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Trip Scheduling",
      description: "Easy trip requests and efficient schedule management",
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      icon: <BarChart className="w-6 h-6" />,
      title: "Analytics",
      description: "Detailed reports and insights for better decision making",
      bgColor: "bg-pink-100",
      iconColor: "text-pink-600"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:opacity-90 transition-opacity">
                LUANAR Fleet
              </Link>
            </div>
            <div className="flex items-center space-x-8">
              <Link href="/about" className="text-gray-600 hover:text-gray-900 transition-colors">
                About
              </Link>
              <Link href="/features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </Link>
              <Link 
                href="/login" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Login
              </Link>
              <Link 
                href="/register" 
                className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-all transform hover:scale-105"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 bg-gradient-to-b from-blue-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 transform transition-all duration-500 hover:translate-x-2">
              <h1 className="text-5xl font-bold leading-tight text-gray-900">
                Smart Fleet Management for 
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {" "}LUANAR
                </span>
              </h1>
              <p className="text-xl text-gray-600">
                Streamline your vehicle operations with our comprehensive fleet management system. Track, manage, and optimize your fleet with ease.
              </p>
              <div className="flex space-x-4 pt-4">
                <Link 
                  href="/register" 
                  className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center"
                >
                  Get Started <ChevronRight className="ml-2" />
                </Link>
                <Link 
                  href="/demo" 
                  className="border border-gray-300 text-gray-600 px-8 py-3 rounded-full hover:bg-gray-50 transition-all transform hover:scale-105"
                >
                  View Demo
                </Link>
              </div>
            </div>
            <div className="relative transform transition-all duration-500 hover:-rotate-2">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-96 rounded-2xl shadow-2xl transform rotate-2"></div>
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-2xl transform -rotate-2"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Comprehensive Fleet Management Solutions
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage your fleet efficiently and effectively
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1"
              >
                <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-6`}>
                  <div className={feature.iconColor}>{feature.icon}</div>
                </div>
                <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Ready to optimize your fleet operations?
          </h2>
          <Link 
            href="/register" 
            className="bg-white text-blue-600 px-8 py-3 rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 inline-block"
          >
            Get Started Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">About</h3>
              <p className="text-gray-400">
                LUANAR Fleet Management System provides comprehensive solutions for vehicle and driver management.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Email: info@luanar.ac.mw</li>
                <li>Phone: +265 1 234 567</li>
                <li>Location: Transport Office, LUANAR Campus</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} LUANAR Fleet Management. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}