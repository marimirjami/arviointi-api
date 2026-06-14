const express = require("express");
const app = express();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = "super_salainen_avain_123";
const bodyParser = require('body-parser');


const db = require("./db");
console.log(db);

app.use(bodyParser.json());

app.get("/opiskelijat", suojaaReitti, (req, res) => {
    db.query("SELECT * FROM opiskelija", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
})
app.post("/opiskelijat", suojaaReitti, (req, res) => {
    const { Etunimi, Sukunimi } = req.body;

    const sql = "INSERT INTO opiskelija (Etunimi, Sukunimi) VALUES (?, ?)";

    db.query(sql, [Etunimi, Sukunimi], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Opiskelija lisätty", id: result.insertId });
    });
});

// 3. UPDATE: Päivitys opiskelijan tiedot
app.put("/opiskelijat/:id", suojaaReitti, (req, res) => {
    const { id } = req.params;
    const { Etunimi, Sukunimi } = req.body;
    const sql = "UPDATE opiskelija SET Etunimi = ?, Sukunimi = ? WHERE idOpiskelija = ?";

    db.query(sql, [Etunimi, Sukunimi, id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Opiskelijan tiedot päivitetty" });
    });
});

// DELETE: Poistetaan opiskelija
app.delete("/opiskelijat/:id", suojaaReitti, (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM opiskelija WHERE idOpiskelija = ?";

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Opiskelija poistettu" });
    });
});


app.get("/opiskelijat/:id/suoritukset", (req, res) => {
    const { id } = req.params;
    // Kutsu Workbenchissä
    const sql = "CALL HaeOpiskelijanSuoritukset(?)";

    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results[0]);
    });
});

// rekisteröi
app.post("/auth/register", async (req, res) => {
    console.log("Rekisteröintipyyntö vastaanotettu:", req.body);
    const { kayttajatunnus, salasana } = req.body;


    try {
        const hashedPassword = await bcrypt.hash(salasana, 10);

        const sql = "INSERT INTO user (kayttajatunnus, salasana) VALUES (?, ?)";
        db.query(sql, [kayttajatunnus, hashedPassword], (err, result) => {
            if (err) {
                console.error("Tietokantavirhe:", err); // TÄMÄ LISÄTTY
                return res.status(500).json({ error: "Tietokantavirhe tai tunnus varattu" });
            }
            res.json({ message: "Käyttäjätunnus luotu onnistuneesti!" });
        });
    } catch (error) {
        console.error("Catch-virhe:", error); // TÄMÄ LISÄTTY
        res.status(500).json({ error: error.message }); // TÄMÄ MUUTETTU
    }
});

// kirjautuminen, login
app.post("/auth/login", (req, res) => {
    const { kayttajatunnus, salasana } = req.body;

    const sql = "SELECT * FROM user WHERE kayttajatunnus = ?";
    db.query(sql, [kayttajatunnus], async (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(401).json({ error: "Käyttäjää ei löydy" });

        const user = results[0];


        const passwordMatch = await bcrypt.compare(salasana, user.salasana);
        if (!passwordMatch) return res.status(401).json({ error: "Väärä salasana" });


        const token = jwt.sign({ id: user.idUser, tunnus: user.kayttajatunnus }, JWT_SECRET, { expiresIn: '24h' });

        // Palautetaan token käyttäjälle
        res.json({ message: "Kirjautuminen onnistui!", token: token });
    });
});

function suojaaReitti(req, res, next) {

    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ error: "Pääsy evätty. Token puuttuu." });
    }

    try {

        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(401).json({ error: "Virheellinen tai vanhentunut token." });
    }
}

app.listen(3000, () => {
    console.log("Serveri käynnissä portissa 3000");
});

