'use client'

import { Avatar } from './ui/avatar'

export function AvatarTest() {
  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold">Test du composant Avatar</h2>
      
      <div className="grid grid-cols-4 gap-4">
        {/* Test avec image */}
        <div className="text-center space-y-2">
          <Avatar
            src="https://vvxipiqffizembeyauwt.supabase.co/storage/v1/object/public/avatars/096faeab-1b74-4d84-b0bd-9e761bd346ea/avatar-1759958563490.JPEG"
            name="Test avec image"
            size="lg"
          />
          <p className="text-sm">Avec image</p>
        </div>
        
        {/* Test avec nom complet */}
        <div className="text-center space-y-2">
          <Avatar
            src={null}
            name="John Doe"
            size="lg"
          />
          <p className="text-sm">John Doe → J</p>
        </div>
        
        {/* Test avec email */}
        <div className="text-center space-y-2">
          <Avatar
            src={null}
            name="john.doe@example.com"
            size="lg"
          />
          <p className="text-sm">john.doe@example.com → D</p>
        </div>
        
        {/* Test avec email simple */}
        <div className="text-center space-y-2">
          <Avatar
            src={null}
            name="johndoe@example.com"
            size="lg"
          />
          <p className="text-sm">johndoe@example.com → J</p>
        </div>
      </div>
      
      <div className="flex gap-4">
        <Avatar src={null} name="A" size="sm" />
        <Avatar src={null} name="B" size="md" />
        <Avatar src={null} name="C" size="lg" />
        <Avatar src={null} name="D" size="xl" />
      </div>
    </div>
  )
}
