'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, ChevronLeft, Check, X } from 'lucide-react';

import { Toaster } from "@/components/ui/toaster";
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';

interface PasswordRequirement {
  id: string;
  label: string;
  validator: (password: string) => boolean;
}

export default function Register() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    staffId: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordRequirements: PasswordRequirement[] = [
    {
      id: 'length',
      label: 'At least 8 characters',
      validator: (password) => password.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'Contains uppercase letter',
      validator: (password) => /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'Contains lowercase letter',
      validator: (password) => /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'Contains number',
      validator: (password) => /\d/.test(password),
    },
    {
      id: 'special',
      label: 'Contains special character',
      validator: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    color: 'bg-gray-200',
  });

  useEffect(() => {
    // Calculate password strength
    const strength = passwordRequirements.reduce((score, requirement) => {
      return score + (requirement.validator(formData.password) ? 1 : 0);
    }, 0);

    const strengthColors = {
      0: 'bg-gray-200',
      1: 'bg-red-500',
      2: 'bg-orange-500',
      3: 'bg-yellow-500',
      4: 'bg-blue-500',
      5: 'bg-green-500',
    };

    setPasswordStrength({
      score: strength,
      color: strengthColors[strength as keyof typeof strengthColors],
    });
  }, [formData.password]);

  // Generate Staff ID based on name
  const generateStaffId = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length < 2) return '';
    
    const firstInitial = names[0][0].toUpperCase();
    const lastInitial = names[names.length - 1][0].toUpperCase();
    const randomNumbers = Math.floor(1000 + Math.random() * 9000); // 4 random numbers
    
    return `${firstInitial}${lastInitial}${randomNumbers}`;
  };

  // Update staff ID when name changes
  useEffect(() => {
    if (formData.name.includes(' ')) { // Only generate if there's at least a first and last name
      const staffId = generateStaffId(formData.name);
      setFormData(prev => ({ ...prev, staffId }));
    }
  }, [formData.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate LUANAR email
    if (!formData.email.endsWith('@luanar.ac.mw')) {
      setError('Please use a valid LUANAR email address');
      setIsLoading(false);
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (passwordStrength.score < 4) {
      setError('Please ensure your password meets all requirements');
      setIsLoading(false);
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Update user profile
      await updateProfile(userCredential.user, {
        displayName: formData.name,
      });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        email: formData.email,
        staffId: formData.staffId,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Show success toast and redirect
      toast({
        title: "Success!",
        description: "Account created successfully. Redirecting to login...",
        variant: "success",
        duration: 2000,
      });

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (error: any) {
      let errorMessage = 'An error occurred during registration';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
        default:
          console.error('Registration error:', error);
      }
      
      // Show error toast
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Back to Home Link */}
      <div className="p-4">
        <Link 
          href="/" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              LUANAR Fleet
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Create Account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Join LUANAR's fleet management system
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Registration Form */}
          <div className="mt-8">
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-8">
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white/60 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    LUANAR Email
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white/60 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="you@luanar.ac.mw"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                {/* Staff ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Staff ID
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      readOnly
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 cursor-not-allowed"
                      value={formData.staffId}
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Auto-generated based on your name
                  </p>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white/60 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                    />
                  </div>

                  {/* Password strength indicator */}
                  <div className="mt-2">
                    <div className="h-2 rounded-full bg-gray-200">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Password requirements */}
                  <div className={`mt-2 space-y-2 ${passwordFocused || formData.password ? 'block' : 'hidden'}`}>
                    {passwordRequirements.map((requirement) => (
                      <div 
                        key={requirement.id}
                        className="flex items-center text-sm"
                      >
                        {requirement.validator(formData.password) ? (
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                        ) : (
                          <X className="w-4 h-4 text-red-500 mr-2" />
                        )}
                        <span className={requirement.validator(formData.password) ? 'text-green-600' : 'text-gray-600'}>
                          {requirement.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
{/* Confirm Password */}
<div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white/60 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    />
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                  )}
                </div>

                {/* Show/Hide Password Toggle */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showPassword"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  <label htmlFor="showPassword" className="ml-2 block text-sm text-gray-900">
                    Show password
                  </label>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isLoading || formData.password !== formData.confirmPassword || passwordStrength.score < 4}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>

                {/* Login Link */}
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}