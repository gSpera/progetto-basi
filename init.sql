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

CREATE SEQUENCE ordine_seq INCREMENT BY 1 NOCACHE NOCYCLE ORDER;
CREATE TABLE ordine (
    id integer primary key, -- Autoincrement
    ddt varchar(20) not null,
    produttore_id integer not null,
    destinatario_id integer not null,
    num_colli integer default 1 not null,
    ritirare_assegno integer not null-- Boolean
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

CREATE SEQUENCE stato_seq INCREMENT BY 1 NOCACHE NOCYCLE ORDER;
CREATE TABLE stato (
    id integer primary key,
    ordine_id integer,
    stato integer,
    quando date
);
ALTER TABLE utente ADD CONSTRAINT fk_utente_azienda
FOREIGN KEY(azienda_id) REFERENCES azienda(id);

ALTER TABLE ordine ADD CONSTRAINT fk_ordine_produttore
FOREIGN KEY(produttore_id) REFERENCES azienda(id);

ALTER TABLE ordine ADD CONSTRAINT fk_ordine_destinatario
FOREIGN KEY(destinatario_id) REFERENCES azienda(id);

ALTER TABLE viaggio ADD CONSTRAINT fk_viaggio_ordine
FOREIGN KEY(id_ordine) REFERENCES ordine(id);

ALTER TABLE stato ADD CONSTRAINT fk_stato_ordine
FOREIGN KEY(ordine_id) REFERENCES ordine(id);

CREATE OR REPLACE PROCEDURE aggiungi_utente(nome IN utente.nome%type, password IN varchar, azienda_nome IN azienda.nome%type)
IS
    hash utente.password%type;
    azienda_id azienda.id%type;
BEGIN
    SELECT STANDARD_HASH(password, 'SHA256') INTO hash FROM dual;
    SELECT id INTO azienda_id FROM azienda WHERE nome=azienda_nome;
    INSERT INTO utente VALUES (nome, hash, azienda_id);
END;

CREATE OR REPLACE PROCEDURE cambia_password_utente(utente_nome IN utente.nome%type, nuova_password IN varchar)
IS
    hash utente.password%type;
BEGIN
    SELECT STANDARD_HASH(nuova_password, 'SHA256') INTO hash FROM dual;
    UPDATE utente SET utente.password=hash WHERE utente.nome=utente_nome;
END;

-- Trigger 
CREATE TRIGGER order_new AFTER INSERT ON ordine FOR EACH ROW
    INSERT INTO stato VALUES (stato_seq.nextval, :new.id, 0, CURRENT_TIMESTAMP)

CREATE TRIGGER ultimi_stati_update AFTER INSERT OR UPDATE OR DELETE ON stato
BEGIN
    CREATE OR REPLACE MATERIALIZED VIEW ultimi_stati AS
    SELECT ordine.ddt, produttore.nome as produttore_nome, destinatario.nome as destinatario_nome, ordine.num_colli, ordine.ritirare_assegno, MAX(stato.stato) as stato, stato_string.value as stato_string, MAX(stato.quando) as quando
    FROM ordine
     JOIN stato ON ordine.id = stato.ordine_id
     JOIN azienda produttore ON ordine.produttore_id = produttore.id
     JOIN azienda destinatario ON ordine.destinatario_id = destinatario.id
     JOIN stato_string ON stato_string.id = (SELECT MAX(stato.stato) FROM stato WHERE ordine_id = ordine.id)
    GROUP BY ordine.ddt, produttore.nome, destinatario.nome, ordine.num_colli, ordine.ritirare_assegno, stato_string.value
    ORDER BY quando DESC;
END; 

CREATE MATERIALIZED VIEW ultimi_stati AS
SELECT ordine.ddt, produttore.nome as produttore_nome, destinatario.nome as destinatario_nome, ordine.num_colli, ordine.ritirare_assegno, MAX(stato.stato) as stato, stato_string.value as stato_string, MAX(stato.quando) as quando
FROM ordine
 JOIN stato ON ordine.id = stato.ordine_id
 JOIN azienda produttore ON ordine.produttore_id = produttore.id
 JOIN azienda destinatario ON ordine.destinatario_id = destinatario.id
 JOIN stato_string ON stato_string.id = (SELECT MAX(stato.stato) FROM stato WHERE ordine_id = ordine.id)
GROUP BY ordine.ddt, produttore.nome, destinatario.nome, ordine.num_colli, ordine.ritirare_assegno, stato_string.value
ORDER BY quando DESC

-- Fase 0 Inserire aziende (Spera Logistica)
INSERT INTO azienda VALUES (-1, 0, 'Spera Logistica', 'Via Speranzosa 123', '12332112312', 'A1A2A3');
INSERT INTO utente VALUES ('gs', '7a5443b6636713baa6350c1cf3ec620b2771a8d411ea3180c5d46b502b9ab77d', -1);
INSERT INTO azienda VALUES (0, 1,  'Facciamo scarpe', 'Via scarpaiola 1', '12312312312', '123AAA');
INSERT INTO azienda VALUES (1, 2, 'Vendiamo scarpe', 'Via scarpetta 2', '32132132112', 'AAA123');

-- Fase 1 Creazione ordine (Facciamo Scarpe, idealmente)
INSERT INTO ordine VALUES(0, 'Scarpe/1', 0, 1, 1, 0);
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

-- SELECT stato_string.value, stato.quando, ordine.ddt FROM stato JOIN ordine ON stato.ordine_id = ordine.id JOIN stato_string ON stato_string.id=stato.id;

