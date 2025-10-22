'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { 
  Sparkles, 
  Zap, 
  Users, 
  Camera, 
  Brain,
  CheckCircle2,
  ArrowRight,
  Clock,
  Shield,
  Smartphone,
  TrendingUp,
  Heart,
  Download,
  Share2,
  Star,
  ChevronRight,
  Play,
  MessageCircle
} from 'lucide-react';
import { useState } from 'react';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'photographer' | 'participant'>('photographer');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      
      
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 dark:bg-blue-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="relative">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-24 pb-20 text-center">
          <div className="max-w-5xl mx-auto">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 rounded-full mb-8 shadow-lg">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Reconnaissance Faciale IA · Temps Réel
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Partagez vos photos
              </span>
              <br />
              <span className="text-slate-900 dark:text-white">
                en quelques clics
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              L'IA identifie automatiquement les personnes sur vos photos. 
              Chaque participant reçoit <span className="font-bold text-slate-900 dark:text-white">uniquement ses photos</span>, 
              sans effort de votre part.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  className="w-full text-lg px-10 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-105 transition-all group"
                >
                  <Zap className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                  Commencer Gratuitement
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <a 
                href="/demo" 
                className="w-full sm:w-auto"
              >
                <Button 
                  size="lg"
                  variant="outline"
                  className="w-full text-lg px-10 py-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-2 border-white/40 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:scale-105 transition-all group"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Demander une démo
                </Button>
              </a>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {['Sophie M.', 'Thomas D.', 'Marie L.', 'Pierre R.'].map((name, i) => (
                    <Avatar 
                      key={i} 
                      name={name} 
                      size="sm" 
                      className="border-2 border-white dark:border-slate-900" 
                    />
                  ))}
                </div>
                <span className="font-semibold">500+ photographes</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold ml-1">4.9/5</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="font-semibold">100% Sécurisé</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-4 mb-16 md:mb-32">
          <div className="max-w-6xl mx-auto">
            
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Comment ça marche ?
                </span>
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                3 étapes simples pour distribuer vos photos instantanément
              </p>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Step 1 */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
                <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 hover:scale-105 transition-all">
                  
                  {/* Step number */}
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-3xl font-black text-white">1</span>
                  </div>

                  {/* Icon */}
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                    <Camera className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>

                  <h3 className="text-2xl font-black mb-3">Uploadez</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Importez toutes les photos de votre événement en une seule fois. 
                    Format illimité accepté.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
                <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 hover:scale-105 transition-all">
                  
                  {/* Step number */}
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-3xl font-black text-white">2</span>
                  </div>

                  {/* Icon */}
                  <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
                    <Brain className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                  </div>

                  <h3 className="text-2xl font-black mb-3">L'IA analyse</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Notre IA détecte et regroupe automatiquement les visages. 
                    Vous validez en un clic.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
                <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 hover:scale-105 transition-all">
                  
                  {/* Step number */}
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-3xl font-black text-white">3</span>
                  </div>

                  {/* Icon */}
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
                    <Share2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  <h3 className="text-2xl font-black mb-3">Partagez</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Chaque participant reçoit automatiquement ses photos par email. 
                    Simple et instantané.
                  </p>
                </div>
              </div>

            </div>

            {/* Time saved banner */}
            <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Clock className="w-6 h-6 text-blue-600" />
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  Économisez 95% de votre temps
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Ce qui prenait <span className="line-through">5 heures</span> prend maintenant <span className="font-bold text-blue-600">15 minutes</span>
              </p>
            </div>
          </div>
        </section>

        {/* Use Cases - Photographer vs Participant */}
        <section id="features" className="container mx-auto px-4 mb-16 md:mb-32 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Pour qui ?
              </h2>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-4 mb-12">
              <button
                onClick={() => setActiveTab('photographer')}
                aria-label="Voir les fonctionnalités pour photographes et organisateurs"
                aria-pressed={activeTab === 'photographer'}
                className={`px-8 py-4 rounded-2xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  activeTab === 'photographer'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
                    : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 text-slate-600 dark:text-slate-400'
                }`}
              >
                📸 Photographes / Organisateurs
              </button>
              <button
                onClick={() => setActiveTab('participant')}
                aria-label="Voir les fonctionnalités pour participants"
                aria-pressed={activeTab === 'participant'}
                className={`px-8 py-4 rounded-2xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  activeTab === 'participant'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
                    : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 text-slate-600 dark:text-slate-400'
                }`}
              >
                🎉 Participants
              </button>
            </div>

            {/* Content */}
            {activeTab === 'photographer' ? (
              <div className="grid md:grid-cols-2 gap-6">
                <FeatureCard
                  icon={<Brain className="w-8 h-8" />}
                  title="IA Ultra-Performante"
                  description="Détection faciale précise à 98%. Même avec masques, lunettes, ou profil."
                  gradient="from-purple-500 to-pink-600"
                />
                <FeatureCard
                  icon={<Zap className="w-8 h-8" />}
                  title="Gain de Temps Massif"
                  description="Fini le tri manuel. L'IA fait 95% du travail en quelques minutes."
                  gradient="from-blue-500 to-indigo-600"
                />
                <FeatureCard
                  icon={<Users className="w-8 h-8" />}
                  title="Gestion Participants"
                  description="Invitez par email. Chacun reçoit uniquement ses photos automatiquement."
                  gradient="from-emerald-500 to-teal-600"
                />
                <FeatureCard
                  icon={<TrendingUp className="w-8 h-8" />}
                  title="Pro Dashboard"
                  description="Analytics, statistiques, exports. Tout pour gérer vos événements comme un pro."
                  gradient="from-orange-500 to-red-600"
                />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <FeatureCard
                  icon={<Heart className="w-8 h-8" />}
                  title="Vos Photos, Rien que Vos Photos"
                  description="Recevez uniquement les photos où vous apparaissez. Pas de tri interminable."
                  gradient="from-pink-500 to-rose-600"
                />
                <FeatureCard
                  icon={<Download className="w-8 h-8" />}
                  title="Téléchargement Illimité"
                  description="Toutes vos photos en haute qualité. Sans filigrane, sans limitation."
                  gradient="from-blue-500 to-cyan-600"
                />
                <FeatureCard
                  icon={<Smartphone className="w-8 h-8" />}
                  title="Sur Tous Vos Appareils"
                  description="Web, iOS, Android. Vos souvenirs accessibles partout, tout le temps."
                  gradient="from-violet-500 to-purple-600"
                />
                <FeatureCard
                  icon={<Share2 className="w-8 h-8" />}
                  title="Partage Facile"
                  description="Partagez vos photos préférées sur vos réseaux sociaux en un clic."
                  gradient="from-emerald-500 to-green-600"
                />
              </div>
            )}
          </div>
        </section>

        {/* Stats Section */}
        <section className="container mx-auto px-4 mb-16 md:mb-32">
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center text-white">
                <div>
                  <div className="text-5xl font-black mb-2">500K+</div>
                  <div className="text-blue-100">Photos traitées</div>
                </div>
                <div>
                  <div className="text-5xl font-black mb-2">98%</div>
                  <div className="text-blue-100">Précision IA</div>
                </div>
                <div>
                  <div className="text-5xl font-black mb-2">15 min</div>
                  <div className="text-blue-100">Temps moyen</div>
                </div>
                <div>
                  <div className="text-5xl font-black mb-2">95%</div>
                  <div className="text-blue-100">Temps économisé</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="container mx-auto px-4 mb-16 md:mb-32 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Ils nous font confiance
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <TestimonialCard
                name="Sophie Martin"
                role="Photographe Mariage"
                avatar="SM"
                quote="Memoria a révolutionné mon workflow. Je livre les photos 10x plus vite à mes clients !"
                rating={5}
              />
              <TestimonialCard
                name="Thomas Dubois"
                role="Organisateur Événements"
                avatar="TD"
                quote="Incroyable. Les participants reçoivent leurs photos automatiquement. Plus de demandes infinies !"
                rating={5}
              />
              <TestimonialCard
                name="Marie Laurent"
                role="Participante"
                avatar="ML"
                quote="J'ai reçu mes 45 photos du mariage en 1 clic. Sans avoir à chercher dans 800 photos !"
                rating={5}
              />
            </div>
          </div>
        </section>

        {/* Pricing Teaser */}
        <section id="pricing" className="container mx-auto px-4 mb-16 md:mb-32 scroll-mt-20">
          <div className="max-w-4xl mx-auto">
            
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Tarifs simples et transparents
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400">
                Commencez gratuitement. Évoluez quand vous voulez.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Free */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 hover:scale-105 transition-all">
                <h3 className="text-2xl font-black mb-2">Free</h3>
                <div className="text-4xl font-black mb-6">
                  0€<span className="text-lg font-normal text-muted-foreground">/mois</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-sm">1 événement actif</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-sm">50 photos max</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Face recognition basique</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-sm">5 participants max</span>
                  </li>
                </ul>
                <Link href="/signup">
                  <Button variant="outline" className="w-full">
                    Commencer
                  </Button>
                </Link>
              </div>

              {/* Pro - Most Popular */}
              <div className="relative">
                {/* Popular badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-full shadow-lg">
                  ⭐ Le plus populaire
                </div>
                
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 text-white shadow-2xl transform scale-105 hover:scale-110 transition-all">
                  <h3 className="text-2xl font-black mb-2">Pro</h3>
                  <div className="text-4xl font-black mb-6">
                    29€<span className="text-lg font-normal opacity-80">/mois</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 mt-0.5" />
                      <span className="text-sm">Événements illimités</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 mt-0.5" />
                      <span className="text-sm">Photos illimitées</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 mt-0.5" />
                      <span className="text-sm">IA avancée + suggestions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 mt-0.5" />
                      <span className="text-sm">Support prioritaire</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 mt-0.5" />
                      <span className="text-sm">Analytics avancés</span>
                    </li>
                  </ul>
                  <Link href="/signup">
                    <Button className="w-full bg-white text-blue-600 hover:bg-blue-50">
                      Essayer 14 jours gratuits
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Enterprise */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 hover:scale-105 transition-all">
                <h3 className="text-2xl font-black mb-2">Enterprise</h3>
                <div className="text-4xl font-black mb-6">
                  Custom
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Tout de Pro +</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-sm">White-label</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-sm">API access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Multi-utilisateurs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Support dédié</span>
                  </li>
                </ul>
                <a href="mailto:contact@memoria.app?subject=Demande Enterprise">
                  <Button variant="outline" className="w-full">
                    Nous contacter
                  </Button>
                </a>
              </div>

            </div>

            {/* Money back guarantee */}
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-full">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-700 dark:text-green-300">
                  Garantie satisfait ou remboursé 30 jours
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 mb-16 md:mb-32">
          <div className="max-w-4xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl blur-2xl opacity-30 group-hover:opacity-40 transition-opacity" />
              
              <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 text-center text-white shadow-2xl">
                <h2 className="text-4xl md:text-5xl font-black mb-4">
                  Prêt à gagner du temps ?
                </h2>
                <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                  Rejoignez des centaines de photographes qui partagent leurs photos 10x plus vite
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/signup">
                    <Button 
                      size="lg" 
                      className="text-lg px-10 py-6 bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:scale-105 transition-all"
                    >
                      Commencer Gratuitement
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  
                  <a href="/demo">
                    <Button 
                      size="lg"
                      variant="outline"
                      className="text-lg px-10 py-6 border-2 border-white text-white hover:bg-white/10"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Parler à un expert
                    </Button>
                  </a>
                </div>

                <p className="text-sm opacity-80 mt-6">
                  Aucune carte bancaire requise · Configuration en 2 minutes
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 pb-12">
          <div className="max-w-6xl mx-auto border-t border-white/20 pt-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              <div>
                <h4 className="font-bold mb-4">Produit</h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li><a href="#features" className="hover:text-blue-600 transition-colors">Fonctionnalités</a></li>
                  <li><a href="#pricing" className="hover:text-blue-600 transition-colors">Tarifs</a></li>
                  <li><a href="#testimonials" className="hover:text-blue-600 transition-colors">Témoignages</a></li>
                  <li><Link href="/signup" className="hover:text-blue-600 transition-colors">S'inscrire</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Entreprise</h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li><span className="text-slate-400 cursor-not-allowed">À propos</span></li>
                  <li><span className="text-slate-400 cursor-not-allowed">Blog</span></li>
                  <li><span className="text-slate-400 cursor-not-allowed">Carrières</span></li>
                  <li><span className="text-slate-400 cursor-not-allowed">Presse</span></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Support</h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li><span className="text-slate-400 cursor-not-allowed">Documentation</span></li>
                  <li><a href="mailto:support@memoria.app" className="hover:text-blue-600 transition-colors">Aide</a></li>
                  <li><a href="/demo" className="hover:text-blue-600 transition-colors">Contact</a></li>
                  <li><span className="text-slate-400 cursor-not-allowed">Status</span></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Légal</h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li><span className="text-slate-400 cursor-not-allowed">Confidentialité</span></li>
                  <li><span className="text-slate-400 cursor-not-allowed">CGU</span></li>
                  <li><span className="text-slate-400 cursor-not-allowed">Cookies</span></li>
                  <li><span className="text-slate-400 cursor-not-allowed">RGPD</span></li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.png" 
                  alt="Memoria Logo" 
                  className="w-8 h-8 rounded-lg"
                />
                <span className="font-bold">© 2025 Memoria. Tous droits réservés.</span>
              </div>
              
              <div className="flex gap-4">
                <span className="text-slate-400 cursor-not-allowed">Twitter</span>
                <span className="text-slate-400 cursor-not-allowed">LinkedIn</span>
                <span className="text-slate-400 cursor-not-allowed">Instagram</span>
                <span className="text-slate-400 cursor-not-allowed">YouTube</span>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

// Helper Components
function FeatureCard({ icon, title, description, gradient }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="relative group">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity`} />
      <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 hover:scale-105 transition-all">
        <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function TestimonialCard({ name, role, avatar, quote, rating }: {
  name: string;
  role: string;
  avatar: string;
  quote: string;
  rating: number;
}) {
  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 hover:scale-105 transition-all">
      {/* Rating */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        ))}
      </div>

      {/* Quote */}
      <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
        "{quote}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <Avatar name={name} size="md" />
        <div>
          <div className="font-bold">{name}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">{role}</div>
        </div>
      </div>
    </div>
  );
}

