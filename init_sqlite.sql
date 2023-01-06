CREATE TABLE utente (
    nome varchar(20) primary key,
    password char(64) not null,
    azienda_id integer not null
);

CREATE TABLE azienda (
    id integer primary key,
    ruolo integer, -- 0: Spera Logistica, 1: Produttore, 2: Destinatario
    nome varchar(20) not null,
    indirizzo varchar(50) not null,
    comune varchar(20),
    regione integer not null,
    partita_iva char(11),
    codice_univoco char(6),
);

CREATE TABLE ordine (
    id integer primary key autoincrement,
    ddt varchar(20),
    ordine varchar(50) not null,
    protocollo varchar(20) not null,
    produttore_id integer not null,
    destinatario_id integer not null,
    num_colli integer default 1 not null,
    ritirare_assegno integer not null,-- Boolean
    note varchar(256)
);

CREATE TABLE viaggio (
    id integer not null,
    id_ordine integer,
    partenza varchar(20),
    destinazione varchar(20),
    motrice char(7),
    data_partenza date,
    data_arrivo date
);

CREATE TABLE stato_string (
    id integer primary key,
    value varchar(30)
);

INSERT INTO stato_string VALUES (0, 'Creato');
INSERT INTO stato_string VALUES (1, 'Pronto per essere ricevuto');
INSERT INTO stato_string VALUES (2, 'In ricezione');
INSERT INTO stato_string VALUES (3, 'In deposito');
INSERT INTO stato_string VALUES (4, 'In archivio');
INSERT INTO stato_string VALUES (5, 'Pronto per essere spedito');
INSERT INTO stato_string VALUES (6, 'Spedito');
INSERT INTO stato_string VALUES (7, 'Consegnato');

CREATE TABLE regione_string (
    id integer primary key,
    value varchar(30)
);

INSERT INTO regione_string VALUES (0, "Abruzzo");
INSERT INTO regione_string VALUES (1, "Basilicata");
INSERT INTO regione_string VALUES (2, "Calabria");
INSERT INTO regione_string VALUES (3, "Campania");
INSERT INTO regione_string VALUES (4, "Emilia Romagna");
INSERT INTO regione_string VALUES (5, "Friuli Venezia Giulia");
INSERT INTO regione_string VALUES (6, "Lazio");
INSERT INTO regione_string VALUES (7, "Liguria");
INSERT INTO regione_string VALUES (8, "Lombardia");
INSERT INTO regione_string VALUES (9, "Marche");
INSERT INTO regione_string VALUES (10, "Molise");
INSERT INTO regione_string VALUES (11, "Piemonte");
INSERT INTO regione_string VALUES (12, "Puglia");
INSERT INTO regione_string VALUES (13, "Sardegna");
INSERT INTO regione_string VALUES (14, "Sicilia");
INSERT INTO regione_string VALUES (15, "Toscana");
INSERT INTO regione_string VALUES (16, "Trentino Alto Adige");
INSERT INTO regione_string VALUES (17, "Umbria");
INSERT INTO regione_string VALUES (18, "Valle d'Aosta");
INSERT INTO regione_string VALUES (19, "Veneto");


CREATE TABLE stato (
    id integer primary key autoincrement,
    ordine_id integer,
    stato integer,
    quando date
);


-- Trigger 
CREATE TRIGGER order_new AFTER INSERT ON ordine FOR EACH ROW
    BEGIN INSERT INTO stato VALUES (NULL, NEW.id, 0, strftime("%Y-%m-%d %H:%M:%S")); END;

CREATE VIEW ultimi_stati AS
SELECT ordine.id,ordine.id,  ordine.ddt, produttore.id as produttore_id, destinatario.id as destinatario_id, produttore.nome as produttore_nome, destinatario.nome as destinatario_nome, ordine.num_colli, ordine.ritirare_assegno, MAX(stato.stato) as stato, stato_string.value as stato_string, MAX(stato.quando) as quando
FROM ordine
 JOIN stato ON ordine.id = stato.ordine_id
 JOIN azienda produttore ON ordine.produttore_id = produttore.id
 JOIN azienda destinatario ON ordine.destinatario_id = destinatario.id
 JOIN stato_string ON stato_string.id = (SELECT MAX(stato.stato) FROM stato WHERE ordine_id = ordine.id)
GROUP BY ordine.ddt, produttore.nome, destinatario.nome, ordine.num_colli, ordine.ritirare_assegno, stato_string.value
ORDER BY quando DESC;

INSERT INTO azienda VALUES (-1, 0, 'Spera Logistica', 'Via Speranzosa 123', '12332112312', 'A1A2A3');
INSERT INTO utente VALUES ('gs', '7a5443b6636713baa6350c1cf3ec620b2771a8d411ea3180c5d46b502b9ab77d', -1);