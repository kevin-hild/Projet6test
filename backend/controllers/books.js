const Book = require('../models/Book');
const fs = require('fs');

//POST : ajouter un nouveau livre
exports.createBook = (req, res, next) => {
    //Stocker la requête en tant que JSON dans une variable
    const bookObject = JSON.parse(req.body.book);

    //Vérifier si la requête contient un fichier
    if (!req.file) {
        return res.status(404).json({ message: 'Fichier manquant'})
    } else {
        //Supprimer les faux identifiants envoyés par le frontend
        delete bookObject._id;
        delete bookObject._userId; 
    }
    //Créer un nouveau livre
    const book = new Book ({
        ...bookObject,
        userId: req.auth.userId,
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
        averageRating: bookObject.ratings[0].grade,
    });
    // Sauvegarder le livre dans la base de données
    book.save()
        .then(() => {res.status(201).json({message: 'Livre enregistré avec succès !'})})
        .catch(error => res.status(400).json({ error }));
};

// POST : ajouter une note à un livre existant
exports.addBookRating = (req, res, next) => {
    const updatedRating = {
        userId: req.auth.userId,
        grade: req.body.rating
    };
    
    // Valider que la note est comprise entre 0 et 5
    if (updatedRating.grade < 0 || updatedRating.grade > 5) {
        return res.status(400).json({ message: 'La note doit être comprise entre 0 et 5' });
    }

    // Trouver le livre par ID
    Book.findOne({ _id: req.params.id }) 
        .then((book) => {
            // Vérifier si l'utilisateur a déjà noté le livre
            if (book.ratings.find(r => r.userId === req.auth.userId)) { 
                return res.status(400).json({ message: 'Vous avez déjà noté ce livre' });
            } else {
                // Ajouter la nouvelle note au tableau des notes
                book.ratings.push(updatedRating); 

                // Calculer la nouvelle note moyenne, en s'assurant qu'elle ait une décimale
                const newAverageRating = (book.averageRating * (book.ratings.length - 1) + updatedRating.grade) / book.ratings.length;

                // Formater la note moyenne à une décimale
                book.averageRating = parseFloat(newAverageRating.toFixed(1));

                // Sauvegarder le livre avec la nouvelle note et la note moyenne mise à jour
                return book.save(); 
            }
        })
        .then((updatedBook) => res.status(201).json(updatedBook))
        .catch(error => res.status(400).json({ error }));
};

//GET : récupérer les 3 livres les mieux notés
exports.getBestBooks = (req, res, next) => {
    // Trouver tous les livres et les trier par note moyenne décroissante (les meilleures en premier)
    Book.find()
        .sort({ averageRating: -1 })  // Trier par note moyenne décroissante
        .limit(3)                      // Limiter le résultat aux 3 meilleurs livres
        .then((books) => {
            if (books.length === 0) {
                return res.status(404).json({ message: 'Aucun livre trouvé.' });
            }
            res.status(200).json(books);  // Envoyer les 3 meilleurs livres en réponse
        })
        .catch((error) => {
            res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des livres.' });
        });
};

//GET : récupérer tous les livres
exports.getAllBooks = (req, res, next) => {
  Book.find()
    .then((books) => {res.status(200).json(books)})
    .catch((error) => {res.status(400).json({error: error})});
};

// GET : récupérer un livre spécifique
exports.getOneBook = (req, res, next) => {
  Book.findOne({_id: req.params.id})
    .then((book) => {res.status(200).json(book)})
    .catch(error => res.status(404).json({ error }));
};

//PUT : mise à jour d'un livre existant si l'utilisateur est le créateur
exports.modifyBook = (req, res, next) => {
    const bookObject = req.file ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}` 
    } : { ...req.body };
    
    delete bookObject._userId;
    
    Book.findOne({_id: req.params.id})
        .then((book) => {
            // Mettre à jour le livre seulement si l'utilisateur est le créateur
            if (book.userId != req.auth.userId) {
                res.status(403).json({ message : '403 : requête interdite' });
            } else {
                // Séparer le nom de fichier de l'image existante
                const filename = book.imageUrl.split('/images/')[1];
                // Si l'image a été modifiée, l'ancienne est supprimée
                req.file && fs.unlink(`images/${filename}`, (err => {
                        if (err) console.log(err);
                    })
                );
                // Mettre à jour le livre
                Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id })
                    .then(() => res.status(200).json({ message: 'Livre mis à jour !' }))
                    .catch(error => res.status(400).json({ error }));
            }
        })
        .catch(error => res.status(404).json({ error }));
};

//DELETE : supprimer un livre si l'utilisateur est le créateur
exports.deleteBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
        .then(book => {
            if (book.userId != req.auth.userId) {
                res.status(403).json({ message: '403 : requête interdite' });
            } else {
                const filename = book.imageUrl.split('/images/')[1];
                // Supprimer le fichier image puis supprimer le livre de la base de données dans le callback
                fs.unlink(`images/${filename}`, () => {
                    Book.deleteOne({ _id: req.params.id })
                        .then(() => { res.status(200).json({ message: 'Objet supprimé !' }) })
                        .catch((error) => {res.status(400).json({error: error})});
                });
            }
        })
        .catch( error => {res.status(404).json({ error })});
};
