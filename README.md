# MHD SHOP V4

Version statique connectée à Supabase Auth et à la table `products`.

## Mise en place
1. Exécuter `setup.sql` dans Supabase > SQL Editor.
2. Vérifier que Google est activé dans Authentication > Providers.
3. Remplacer les fichiers du dépôt GitHub par ceux de ce ZIP.
4. Tester la connexion Email et Google.

La clé `sb_publishable_...` est prévue pour être utilisée côté navigateur. Ne jamais mettre une Secret key/service_role ou un Google Client Secret dans le code public.
