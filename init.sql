CREATE TABLE utente (
    nome varchar(20) primary key,
    password char(64) not null,
    azienda_id integer not null
);

CREATE TABLE azienda (
    id integer primary key,
    ruolo integer, -- 0: Spera Logistica, 1: Produttore, 2: Destinatario
    nome varchar(20) not null,
    indirizzo varchar(50),
    partita_iva char(11),
    codice_univoco char(6)
);

CREATE TABLE ordine (
    id integer primary key, -- Autoincrement
    ddt varchar(20),
    produttore_id integer not null,
    destinatario_id integer not null,
    num_colli integer default 1,
    ritirare_assegno integer -- Boolean
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

CREATE TABLE stato (
    id integer primary key,
    ordine_id integer,
    stato integer,
    quando date
);

-- Fase 0 Inserire aziende (Spera Logistica)
INSERT INTO azienda VALUES (-1, , 0'Spera Logistica', 'Via Speranzosa 123', '12332112312', 'A1A2A3');
INSERT INTO utente VALUES ('gs', '7a5443b6636713baa6350c1cf3ec620b2771a8d411ea3180c5d46b502b9ab77d', -1);
INSERT INTO azienda VALUES (0, 1,  'Facciamo scarpe', 'Via scarpaiola 1', '12312312312', '123AAA');
INSERT INTO azienda VALUES (1, 2, 'Vendiamo scarpe', 'Via scarpetta 2', '32132132112', 'AAA123');

-- Fase 1 Creazione ordine (Facciamo Scarpe, idealmente)
INSERT INTO ordine VALUES(0, 'Scarpe/1', 0, 1, 1, 0, 0);
INSERT INTO stato  VALUES(0, 0, 0, '01-GEN-2022');

-- Fase 2 Aggiornamento stato (Spera Logistica)
INSERT INTO stato VALUES (1, 0, 1, '02-GEN-22');
INSERT INTO stato VALUES (2, 0, 2, '02-GEN-22');
INSERT INTO stato VALUES (3, 0, 3, '03-GEN-22');
INSERT INTO viaggio VALUES (0, 0, 'DP Facciamo Scarpe', 'DP Spera Logistica', 'AB123AX', '03-GEN-22', '03-GEN-22');
INSERT INTO stato VALUES (4, 0, 5, '03-GEN-22');
INSERT INTO stato VALUES (5, 0, 6, '04-GEN-22');
INSERT INTO stato VALUES (6, 0, 7, '05-GEN-22');
INSERT INTO viaggio VALUES (1, 0, 'DP Spera Logistica', 'Negozio', 'CD321XA', '07-GEN-22', '07-GEN-22');

SELECT stato_string.value, stato.quando, ordine.ddt FROM stato JOIN ordine ON stato.ordine_id = ordine.id JOIN stato_string ON stato_string.id=stato.id;