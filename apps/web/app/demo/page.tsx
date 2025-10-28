'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Mail, Phone, MapPin, Clock, Users, Camera, Brain } from 'lucide-react'

export default function DemoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    eventType: '',
    participants: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simuler l'envoi d'email
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Ici on pourrait intégrer un service d'email comme Resend, SendGrid, etc.
      console.log('Demo request:', formData)
      
      setIsSubmitted(true)
    } catch (error) {
      console.error('Error submitting demo request:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Demande envoyée !</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Nous vous contacterons dans les 24h pour planifier votre démonstration personnalisée.
            </p>
            <Button 
              onClick={() => {
                setIsSubmitted(false)
                setFormData({
                  name: '',
                  email: '',
                  company: '',
                  phone: '',
                  eventType: '',
                  participants: '',
                  message: ''
                })
              }}
              className="w-full"
            >
              Faire une nouvelle demande
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">

      <div className="container mx-auto px-4 pt-32 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Demandez votre démo
              </span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Découvrez comment Memoria peut transformer votre workflow de partage de photos
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Formulaire */}
            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20">
              <CardHeader>
                <CardTitle className="text-2xl">Réservez votre démo</CardTitle>
                <CardDescription>
                  Remplissez ce formulaire et nous vous contacterons pour planifier une démonstration personnalisée
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2">
                        Nom complet *
                      </label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Votre nom"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2">
                        Email *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="votre@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium mb-2">
                        Entreprise/Organisation
                      </label>
                      <Input
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        placeholder="Nom de votre entreprise"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium mb-2">
                        Téléphone
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+33 6 12 34 56 78"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="eventType" className="block text-sm font-medium mb-2">
                        Type d'événement
                      </label>
                      <select
                        id="eventType"
                        name="eventType"
                        value={formData.eventType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value="">Sélectionnez un type</option>
                        <option value="mariage">Mariage</option>
                        <option value="corporate">Événement d'entreprise</option>
                        <option value="anniversaire">Anniversaire</option>
                        <option value="conference">Conférence</option>
                        <option value="sport">Événement sportif</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="participants" className="block text-sm font-medium mb-2">
                        Nombre de participants
                      </label>
                      <select
                        id="participants"
                        name="participants"
                        value={formData.participants}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value="">Sélectionnez</option>
                        <option value="1-10">1-10 personnes</option>
                        <option value="11-50">11-50 personnes</option>
                        <option value="51-100">51-100 personnes</option>
                        <option value="100+">100+ personnes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                      Message (optionnel)
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Décrivez vos besoins spécifiques..."
                      rows={4}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Envoi en cours...' : 'Demander ma démo'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Informations */}
            <div className="space-y-8">
              <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Ce qui vous attend
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold">Démonstration personnalisée</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        30 minutes pour découvrir Memoria avec vos propres photos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold">Test de l'IA</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Voyez l'IA identifier automatiquement les personnes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold">Conseils personnalisés</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Optimisez votre workflow selon vos besoins
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    Contact direct
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-600" />
                    <a 
                      href="mailto:manseur_aghiles@hotmail.fr"
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      manseur_aghiles@hotmail.fr
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-600" />
                    <span className="text-slate-600">+33 6 XX XX XX XX</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-slate-600" />
                    <span className="text-slate-600">Paris, France</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Brain className="w-6 h-6" />
                    <h3 className="text-lg font-bold">Pourquoi choisir Memoria ?</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li>• <strong>98% de précision</strong> dans la reconnaissance faciale</li>
                    <li>• <strong>95% de temps économisé</strong> sur le tri des photos</li>
                    <li>• <strong>Distribution automatique</strong> aux participants</li>
                    <li>• <strong>Interface intuitive</strong> pour tous les niveaux</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
