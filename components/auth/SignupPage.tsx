import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '../ui/Icons';

export const SignupPage: React.FC = () => {
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const auth = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        setIsLoading(true);

        try {
            const result = await auth.signup(name, surname, email, password);
            if (result.success) {
                navigate('/');
            }
            // Error is handled by useAuth hook and displayed via authError
        } catch (error) {
            console.error('Signup error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex justify-content-center align-items-center bg-dark-bg p-4">
            <div className="w-100 mw-md bg-dark-card rounded-4 shadow-lg p-4 p-lg-5">
                <div className="text-center mb-4">
                    <div className="d-inline-flex justify-content-center align-items-center bg-dark-sidebar rounded-circle mb-4" style={{width: "4rem", height: "4rem"}}>
                        <img
                            src="/assets/unnamed.webp"
                            alt="CK Health Logo"
                            style={{width: "2.5rem", height: "2.5rem"}}
                            className="object-contain"
                        />
                    </div>
                    <h1 className="fs-2 fw-bold text-white">
                        Create Account
                    </h1>
                    <p className="text-text-secondary mt-2">Join the CK AI Assistant platform</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <div className="row g-3 mb-3">
                            <div className="col-sm-6">
                                <label className="form-label fw-bold text-white mb-2">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    disabled={isLoading || auth.loading}
                                    className="form-control bg-dark-border text-white border-dark-border border-2"
                                    style={{borderRadius: "0.75rem"}}
                                    placeholder="Enter your name"
                                />
                            </div>
                            <div className="col-sm-6">
                                <label className="form-label fw-bold text-white mb-2">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={surname}
                                    onChange={(e) => setSurname(e.target.value)}
                                    required
                                    disabled={isLoading || auth.loading}
                                    className="form-control bg-dark-border text-white border-dark-border border-2"
                                    style={{borderRadius: "0.75rem"}}
                                    placeholder="Enter your surname"
                                />
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label fw-bold text-white mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading || auth.loading}
                                className="form-control bg-dark-border text-white border-dark-border border-2"
                                style={{borderRadius: "0.75rem"}}
                                placeholder="Enter your email"
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label fw-bold text-white mb-2">
                                Password
                            </label>
                            <div className="position-relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading || auth.loading}
                                    className="form-control bg-dark-border text-white border-dark-border border-2"
                                    style={{borderRadius: "0.75rem", paddingRight: "3rem"}}
                                    placeholder="Create a password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="btn btn-link position-absolute top-50 end-0 translate-middle-y p-0 me-1 text-text-secondary"
                                    disabled={isLoading || auth.loading}
                                    style={{border: "none"}}
                                >
                                    <div style={{width: "1.25rem", height: "1.25rem"}}>
                                        {showPassword ? (
                                            <EyeSlashIcon />
                                        ) : (
                                            <EyeIcon />
                                        )}
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {(auth.authError) && (
                        <div className="alert alert-danger border-0 rounded-4" style={{backgroundColor: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.5)"}}>
                            <p className="text-danger mb-0 small">{auth.authError}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || auth.loading}
                        className="btn w-100 py-3 px-4 fw-semibold bg-dark-border hover:bg-dark-card text-white border-0 rounded-4 transition-all disabled:opacity-50"
                        style={{borderRadius: "0.75rem"}}
                    >
                        {isLoading || auth.loading ? (
                            <>
                                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                Creating Account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <p className="text-text-secondary mb-0">
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="fw-semibold text-primary text-decoration-none transition-all"
                            style={{transitionDuration: "0.2s"}}
                        >
                            Sign in here
                        </Link>
                    </p>
                </div>


            </div>
        </div>
    );
};
