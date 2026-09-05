/**
 * Dorago Travel Platform - Main Application Controller
 * Mobile-first travel itinerary organization with email OTP auth, offline caching, and Gemini AI parser.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Trip, PlanItem, TravelDocument, UserProfile, ParserResult, ExtractedPlanProposal } from './types';
import { AuthService } from './services/authService';
import { TripService } from './services/tripService';
import { DocumentService } from './services/documentService';
import { ReminderService } from './services/reminderService';
import { AiImportService } from './services/aiImportService';
import { OfflineSyncService } from './services/offlineSyncService';
import { SeedData } from './data/seedData';
import { ClientStorage } from './storage/clientStorage';

// Screen & UI imports
import { LoginScreen } from './features/auth/LoginScreen';
import { OtpVerificationScreen } from './features/auth/OtpVerificationScreen';
import { OnboardingScreen } from './features/auth/OnboardingScreen';
import { TripsHomeScreen } from './features/trips/TripsHomeScreen';
import { TripDetailScreen } from './features/trips/TripDetailScreen';
import { ImportScreen } from './features/import/ImportScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';

// Modals
import { CreateTripModal } from './components/trips/CreateTripModal';
import { AddPlanModal } from './components/plans/AddPlanModal';
import { ImportReviewModal } from './components/import/ImportReviewModal';
import { TestRunnerModal } from './features/testing/TestRunnerModal';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { Modal } from './components/ui/Modal';
import { Button } from './components/ui/Button';

// Icons
import { Compass, Sparkles, User, Bell, CheckCircle2 } from 'lucide-react';

type AppView = 'trips' | 'trip-detail' | 'import' | 'profile';

export function App() {
  // 1. Core State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authStep, setAuthStep] = useState<'login' | 'otp' | 'onboarding'>('login');
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [devHintCode, setDevHintCode] = useState<string | undefined>();
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | undefined>();

  // 2. Navigation State
  const [currentView, setCurrentView] = useState<AppView>('trips');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // 3. Trips & Plans Reactive State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [nextUp, setNextUp] = useState<{ plan: PlanItem; trip: Trip } | null>(null);

  // 4. Modal Triggers
  const [showCreateTripModal, setShowCreateTripModal] = useState<boolean>(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const [showAddPlanModal, setShowAddPlanModal] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);

  const [showImportReviewModal, setShowImportReviewModal] = useState<boolean>(false);
  const [parserResult, setParserResult] = useState<ParserResult | null>(null);

  const [showTestRunnerModal, setShowTestRunnerModal] = useState<boolean>(false);
  const [reminderPlan, setReminderPlan] = useState<PlanItem | null>(null);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);

  // Reload local state
  const refreshData = useCallback(() => {
    const allTrips = TripService.getAllTrips();
    setTrips(allTrips);
    setPlans(ClientStorage.getPlans());
    setDocuments(DocumentService.getAllDocuments());
    setNextUp(TripService.getNextUpPlan());
  }, []);

  // Initialize App on load
  useEffect(() => {
    // 1. Initialize offline sync engine
    OfflineSyncService.init();

    // 2. Ensure seed data exists
    SeedData.initialize();

    // 3. Check existing authentication session
    const session = ClientStorage.getSession();
    if (session && session.isValid) {
      setCurrentUser(session.profile);
      setAuthStep('login');
    } else {
      // Default to unauthenticated login
      setCurrentUser(null);
      setAuthStep('login');
    }

    refreshData();
  }, [refreshData]);

  // Auth Handlers
  const handleEmailSubmitted = async (email: string) => {
    setAuthLoading(true);
    setAuthError(undefined);
    try {
      const res = await AuthService.requestOtp(email);
      if (res.success) {
        setPendingEmail(email);
        setDevHintCode(res.devHintCode);
        setAuthStep('otp');
      } else {
        setAuthError(res.message || 'Unable to send verification code.');
      }
    } catch (err: any) {
      setAuthError('Connection error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setAuthLoading(true);
    setAuthError(undefined);
    try {
      const res = await AuthService.verifyOtp(pendingEmail, code);
      if (res.success && res.profile) {
        setCurrentUser(res.profile);
        refreshData();
        if (res.isFirstLogin) {
          setAuthStep('onboarding');
        } else {
          setAuthStep('login');
          setCurrentView('trips');
        }
      } else {
        setAuthError(res.message || 'Invalid 6-digit verification code.');
      }
    } catch (err) {
      setAuthError('Verification failed. Please check code.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingEmail) return;
    const res = await AuthService.requestOtp(pendingEmail);
    if (res.devHintCode) setDevHintCode(res.devHintCode);
  };

  const handleCompleteOnboarding = (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = AuthService.updateProfile(updates);
    if (updated) setCurrentUser(updated);
    setAuthStep('login');
    setCurrentView('trips');
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    setAuthStep('login');
    setCurrentView('trips');
  };

  const handleDeleteAccount = () => {
    AuthService.deleteAccount();
    setCurrentUser(null);
    setAuthStep('login');
    setCurrentView('trips');
  };

  const handleResetSeedData = () => {
    SeedData.reset();
    refreshData();
  };

  // Trip CRUD Handlers
  const handleSaveTrip = (tripData: any) => {
    if (editingTrip) {
      TripService.updateTrip(editingTrip.id, tripData);
    } else {
      const created = TripService.createTrip(tripData);
      setSelectedTripId(created.id);
      setCurrentView('trip-detail');
    }
    setEditingTrip(null);
    refreshData();
  };

  const handleArchiveTrip = (tripId: string) => {
    const trip = TripService.getTripById(tripId);
    if (trip) {
      TripService.updateTrip(tripId, { isArchived: !trip.isArchived });
      refreshData();
    }
  };

  const handleDeleteTrip = (tripId: string) => {
    TripService.deleteTrip(tripId);
    setSelectedTripId(null);
    setCurrentView('trips');
    refreshData();
  };

  // Plan CRUD Handlers
  const handleSavePlan = (planData: any) => {
    if (editingPlan) {
      TripService.updatePlan(editingPlan.id, planData);
    } else {
      TripService.createPlan(planData);
    }
    setEditingPlan(null);
    refreshData();
  };

  const handleDeletePlan = (planId: string) => {
    TripService.deletePlan(planId);
    refreshData();
  };

  const handleDuplicatePlan = (planId: string) => {
    TripService.duplicatePlan(planId);
    refreshData();
  };

  // AI Import Handlers
  const handleParseSuccess = (result: ParserResult) => {
    setParserResult(result);
    setShowImportReviewModal(true);
  };

  const handleAcceptImportedPlans = (
    selectedProposals: ExtractedPlanProposal[],
    targetTripId: string,
    userOverrides: Record<string, Record<string, any>>
  ) => {
    AiImportService.acceptProposals(selectedProposals, targetTripId, userOverrides);
    setShowImportReviewModal(false);
    setSelectedTripId(targetTripId);
    setCurrentView('trip-detail');
    refreshData();
  };

  const handleCreateTripAndAccept = (
    newTripData: any,
    selectedProposals: ExtractedPlanProposal[],
    userOverrides: Record<string, Record<string, any>>
  ) => {
    const newTrip = TripService.createTrip(newTripData);
    AiImportService.acceptProposals(selectedProposals, newTrip.id, userOverrides);
    setShowImportReviewModal(false);
    setSelectedTripId(newTrip.id);
    setCurrentView('trip-detail');
    refreshData();
  };

  // Document Handlers
  const handleUploadDocument = async (file: File, planId?: string) => {
    if (!selectedTripId) return;
    await DocumentService.uploadDocument(file, { tripId: selectedTripId, planId });
    refreshData();
  };

  const handleDeleteDocument = (docId: string) => {
    DocumentService.deleteDocument(docId);
    refreshData();
  };

  // Reminders
  const handleCreateReminder = (plan: PlanItem, type: any) => {
    ReminderService.createReminder(plan, type);
    setReminderPlan(null);
    setReminderNotice(`Reminder set for ${plan.title}`);
    setTimeout(() => setReminderNotice(null), 3000);
  };

  // Active Trip Data
  const activeTrip = trips.find((t) => t.id === selectedTripId) || null;
  const activeTripPlans = selectedTripId ? TripService.getPlansForTrip(selectedTripId) : [];
  const activeTripDocuments = selectedTripId ? DocumentService.getDocumentsForTrip(selectedTripId) : [];

  // ==========================================
  // Render Unauthenticated Flow (Strict OTP)
  // ==========================================
  if (!currentUser) {
    if (authStep === 'otp') {
      return (
        <OtpVerificationScreen
          email={pendingEmail}
          devHintCode={devHintCode}
          onVerify={handleVerifyOtp}
          onResend={handleResendOtp}
          onChangeEmail={() => setAuthStep('login')}
          isLoading={authLoading}
          error={authError}
        />
      );
    }
    return (
      <LoginScreen
        onEmailSubmitted={handleEmailSubmitted}
        isLoading={authLoading}
        error={authError}
      />
    );
  }

  // First-time traveler onboarding
  if (authStep === 'onboarding') {
    return <OnboardingScreen user={currentUser} onComplete={handleCompleteOnboarding} />;
  }

  // ==========================================
  // Render Authenticated Main Application
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Offline Status Bar */}
      <OfflineBanner />

      {/* Reminder notification toast */}
      {reminderNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-teal-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} />
          <span>{reminderNotice}</span>
        </div>
      )}

      {/* View Routing */}
      <main className="w-full">
        {currentView === 'trips' && (
          <TripsHomeScreen
            trips={trips}
            user={currentUser}
            nextUp={nextUp}
            onSelectTrip={(tripId) => {
              setSelectedTripId(tripId);
              setCurrentView('trip-detail');
            }}
            onNewTrip={() => {
              setEditingTrip(null);
              setShowCreateTripModal(true);
            }}
            onImport={() => setCurrentView('import')}
            onOpenProfile={() => setCurrentView('profile')}
          />
        )}

        {currentView === 'trip-detail' && activeTrip && (
          <TripDetailScreen
            trip={activeTrip}
            plans={activeTripPlans}
            documents={activeTripDocuments}
            onBack={() => {
              setSelectedTripId(null);
              setCurrentView('trips');
            }}
            onAddPlan={() => {
              setEditingPlan(null);
              setShowAddPlanModal(true);
            }}
            onImportToTrip={() => setCurrentView('import')}
            onEditTrip={() => {
              setEditingTrip(activeTrip);
              setShowCreateTripModal(true);
            }}
            onArchiveTrip={() => handleArchiveTrip(activeTrip.id)}
            onDeleteTrip={() => handleDeleteTrip(activeTrip.id)}
            onEditPlan={(plan) => {
              setEditingPlan(plan);
              setShowAddPlanModal(true);
            }}
            onDeletePlan={handleDeletePlan}
            onDuplicatePlan={handleDuplicatePlan}
            onAddReminder={(plan) => setReminderPlan(plan)}
            onUploadDocument={handleUploadDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        )}

        {currentView === 'import' && (
          <ImportScreen
            trips={trips}
            preselectedTripId={selectedTripId || undefined}
            onBack={() => {
              if (selectedTripId) setCurrentView('trip-detail');
              else setCurrentView('trips');
            }}
            onParseSuccess={handleParseSuccess}
          />
        )}

        {currentView === 'profile' && (
          <ProfileScreen
            user={currentUser}
            onBack={() => setCurrentView('trips')}
            onUpdateProfile={(updates) => {
              const updated = AuthService.updateProfile(updates);
              if (updated) setCurrentUser(updated);
            }}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            onResetSeedData={handleResetSeedData}
            onOpenTestRunner={() => setShowTestRunnerModal(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar per PRD Section 10 */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-slate-950/90 backdrop-blur-lg border-t border-slate-900/90 px-6 py-2 flex items-center justify-around max-w-xl mx-auto">
        <button
          onClick={() => {
            setSelectedTripId(null);
            setCurrentView('trips');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-semibold transition-colors ${
            currentView === 'trips' || currentView === 'trip-detail'
              ? 'text-teal-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass size={20} />
          <span>Trips</span>
        </button>

        <button
          onClick={() => setCurrentView('import')}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-semibold transition-colors ${
            currentView === 'import' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles size={20} />
          <span>AI Import</span>
        </button>

        <button
          onClick={() => setCurrentView('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-semibold transition-colors ${
            currentView === 'profile' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>

      {/* ==========================================
          MODALS & DRAWERS
         ========================================== */}

      {/* Create / Edit Trip Modal */}
      <CreateTripModal
        isOpen={showCreateTripModal}
        onClose={() => {
          setShowCreateTripModal(false);
          setEditingTrip(null);
        }}
        onSubmit={handleSaveTrip}
        initialData={editingTrip}
      />

      {/* Add / Edit Plan Modal */}
      {activeTrip && (
        <AddPlanModal
          isOpen={showAddPlanModal}
          onClose={() => {
            setShowAddPlanModal(false);
            setEditingPlan(null);
          }}
          trip={activeTrip}
          onSubmit={handleSavePlan}
          initialData={editingPlan}
        />
      )}

      {/* AI Import Review Modal */}
      <ImportReviewModal
        isOpen={showImportReviewModal}
        onClose={() => {
          setShowImportReviewModal(false);
          setParserResult(null);
        }}
        result={parserResult}
        trips={trips}
        onAccept={handleAcceptImportedPlans}
        onCreateTripAndAccept={handleCreateTripAndAccept}
      />

      {/* PRD Acceptance Test Runner Modal */}
      <TestRunnerModal
        isOpen={showTestRunnerModal}
        onClose={() => setShowTestRunnerModal(false)}
      />

      {/* Add Reminder Dialog */}
      {reminderPlan && (
        <Modal
          isOpen={!!reminderPlan}
          onClose={() => setReminderPlan(null)}
          title="Add Plan Reminder"
          subtitle={`Schedule notification for ${reminderPlan.title}`}
          maxWidth="sm"
        >
          <div className="space-y-2">
            {[
              { id: '1_day_before', label: '1 Day Before Departure' },
              { id: '2_hours_before', label: '2 Hours Before (Recommended for flights)' },
              { id: '1_hour_before', label: '1 Hour Before' },
              { id: '30_min_before', label: '30 Minutes Before' },
              { id: 'at_event_time', label: 'At Event Start Time' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => handleCreateReminder(reminderPlan, option.id)}
                className="w-full text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-teal-300 transition-colors flex items-center justify-between"
              >
                <span>{option.label}</span>
                <Bell size={14} className="text-teal-400" />
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
export default App;
