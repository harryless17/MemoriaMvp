/**
 * Helper functions pour gérer l'affichage des utilisateurs
 */

/**
 * Retourne le nom d'affichage de l'utilisateur
 * Priorité: display_name > email > 'Utilisateur'
 */
export function getUserDisplayName(user: {
  display_name?: string | null;
  email?: string | null;
}): string {
  if (user.display_name) {
    return user.display_name;
  }
  if (user.email) {
    return user.email;
  }
  return 'Utilisateur';
}

/**
 * Retourne les initiales pour l'avatar
 */
export function getUserInitials(user: {
  display_name?: string | null;
  email?: string | null;
}): string {
  const name = getUserDisplayName(user);
  
  // Si c'est un email, prendre la première lettre avant le @
  if (name.includes('@')) {
    return name.charAt(0).toUpperCase();
  }
  
  // Sinon, prendre les initiales des 2 premiers mots
  const words = name.split(' ').filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  
  return name.substring(0, 2).toUpperCase();
}

