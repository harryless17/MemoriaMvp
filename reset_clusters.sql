-- Supprimer tous les clusters et faces de l'événement de test
DELETE FROM face_persons WHERE event_id = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef';
DELETE FROM faces WHERE event_id = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef';
DELETE FROM ml_jobs WHERE event_id = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef';
