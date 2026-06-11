const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.urlencoded({ extended: true }));

const ADMIN_PASSWORD = "12345";
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "vitoria_sc.db");

console.log("__dirname:", __dirname);
console.log("ficheiros:", fs.readdirSync(__dirname));
console.log("dbPath:", dbPath);
console.log("existe db?", fs.existsSync(dbPath));

const db = new sqlite3.Database(dbPath);

app.use("/imagens", express.static("C:/OCR/imagens_processadas"));

function adicionarColuna(nome, tipo) {
  db.run(`ALTER TABLE inscricoes ADD COLUMN ${nome} ${tipo}`, () => {});
}

db.run(`CREATE TABLE IF NOT EXISTS inscricoes (id INTEGER PRIMARY KEY AUTOINCREMENT)`);

[
  "nome_completo",
  "filiacao",
  "proponente",
  "data_nascimento",
  "profissao",
  "nacionalidade",
  "concelho",
  "distrito",
  "nome_ficheiro",
  "estado",
  "criado_em"
].forEach(c => adicionarColuna(c, "TEXT"));

app.get("/", (req, res) => {
  res.redirect("/admin");
});

app.get("/admin", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Administração - Inscrições</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

<style>
body {
  background: #f5f5f5;
}

.topo {
  background: #111;
  color: white;
  padding: 35px;
  text-align: center;
  border-bottom: 4px solid #d4af37;
}

.card-admin {
  border: none;
  border-radius: 15px;
  box-shadow: 0 10px 25px rgba(0,0,0,.08);
}

.btn-vsc {
  background: #111;
  color: white;
  border: none;
}

.btn-vsc:hover {
  background: #d4af37;
  color: black;
}
</style>
</head>

<body>

<div class="topo">
  <h1>Vitória Sport Clube</h1>
  <p>Arquivo Histórico de Inscrições</p>
</div>

<div class="container mt-5" style="max-width:420px;">
<div class="card card-admin">
<div class="card-body p-4">

<h2 class="mb-4 text-center">Área Administrativa</h2>

<form method="POST" action="/admin">
<label class="form-label">Palavra-passe</label>
<input class="form-control mb-3" type="password" name="password" required>

<button class="btn btn-vsc w-100" type="submit">
Entrar
</button>
</form>

</div>
</div>
</div>

</body>
</html>
`);
});

app.post("/admin", (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    return res.send(`
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

<div class="container mt-5">
<div class="alert alert-danger">Palavra-passe incorreta.</div>
<a class="btn btn-dark" href="/admin">Voltar</a>
</div>
    `);
  }

  mostrarAdmin(res);
});

app.post("/admin/pesquisar", (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    return res.send("Acesso negado.");
  }

  mostrarAdmin(res, req.body.pesquisa || "", req.body.estado || "");
});
function mostrarAdmin(res, pesquisa = "", estado = "") {
  let sql = "SELECT * FROM inscricoes WHERE 1=1";
  const params = [];

  if (pesquisa.trim() !== "") {
    sql += `
      AND (
        LOWER(nome_completo) LIKE LOWER(?)
        OR LOWER(socio_proposto) LIKE LOWER(?)
        OR LOWER(proponente) LIKE LOWER(?)
        OR LOWER(concelho) LIKE LOWER(?)
        OR LOWER(distrito) LIKE LOWER(?)
        OR LOWER(nome_ficheiro) LIKE LOWER(?)
        OR LOWER(ficheiro_processado) LIKE LOWER(?)
        OR LOWER(ficheiro_original) LIKE LOWER(?)
      )
    `;

    const termo = `%${pesquisa}%`;

    params.push(
      termo,
      termo,
      termo,
      termo,
      termo,
      termo,
      termo,
      termo
    );
  }

  if (estado.trim() !== "") {
    sql += " AND estado = ?";
    params.push(estado);
  }

  sql += " ORDER BY id DESC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.send(err.message);
    }

    let html = `
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

<div class="container-fluid mt-4">

<h1>Administração - Inscrições</h1>

<form method="POST" action="/admin/pesquisar" class="row g-2 mb-3">
<input type="hidden" name="password" value="${ADMIN_PASSWORD}">

<div class="col-md-5">
<input class="form-control" name="pesquisa" placeholder="Pesquisar nome, apelido, proponente, concelho, distrito ou ficheiro" value="${escapeHtml(pesquisa)}">
</div>

<div class="col-md-3">
<select class="form-select" name="estado">
<option value="">Todos os estados</option>
<option value="Nova inscrição" ${estado === "Nova inscrição" ? "selected" : ""}>Nova inscrição</option>
<option value="Por rever" ${estado === "Por rever" ? "selected" : ""}>Por rever</option>
<option value="Confirmado" ${estado === "Confirmado" ? "selected" : ""}>Confirmado</option>
<option value="Erro OCR" ${estado === "Erro OCR" ? "selected" : ""}>Erro OCR</option>
<option value="Duplicado" ${estado === "Duplicado" ? "selected" : ""}>Duplicado</option>
</select>
</div>

<div class="col-md-2">
<button class="btn btn-dark w-100" type="submit">Pesquisar</button>
</div>

<div class="col-md-2">
<a class="btn btn-secondary w-100" href="/admin">Sair</a>
</div>
</form>

<p><strong>Total:</strong> ${rows.length}</p>

<table class="table table-striped table-bordered table-sm align-middle">
<thead>
<tr>
<th>ID</th>
<th>Nome completo</th>
<th>Filiação</th>
<th>Proponente</th>
<th>Data nascimento</th>
<th>Profissão</th>
<th>Nacionalidade</th>
<th>Concelho</th>
<th>Distrito</th>
<th>Nome ficheiro</th>
<th>Estado</th>
<th>Criado em</th>
<th>Ações</th>
</tr>
</thead>
<tbody>
`;

    rows.forEach(r => {
      const ficheiro = r.ficheiro_processado || r.nome_ficheiro || "";
      let botaoFicheiro = "";

      if (ficheiro && ficheiro !== "formulario_site") {
        botaoFicheiro = `
<a class="btn btn-sm btn-secondary" target="_blank" href="/imagens/${encodeURIComponent(ficheiro)}">
Ver ficheiro
</a>`;
      }

      html += `
<tr>
<td>${r.id || ""}</td>
<td>${escapeHtml(r.nome_completo || r.socio_proposto || "")}</td>
<td>${escapeHtml(r.filiacao || "")}</td>
<td>${escapeHtml(r.proponente || "")}</td>
<td>${escapeHtml(r.data_nascimento || "")}</td>
<td>${escapeHtml(r.profissao || "")}</td>
<td>${escapeHtml(r.nacionalidade || "")}</td>
<td>${escapeHtml(r.concelho || "")}</td>
<td>${escapeHtml(r.distrito || "")}</td>
<td>${escapeHtml(ficheiro)}</td>
<td>${escapeHtml(r.estado || "")}</td>
<td>${escapeHtml(r.criado_em || "")}</td>
<td>
<a class="btn btn-sm btn-primary" href="/editar/${r.id}">Editar</a>
${botaoFicheiro}
</td>
</tr>`;
    });

    html += `
</tbody>
</table>
</div>
`;

    res.send(html);
  });
}
app.get("/editar/:id", (req, res) => {
  db.get("SELECT * FROM inscricoes WHERE id = ?", [req.params.id], (err, r) => {
    if (err || !r) {
      return res.send("Inscrição não encontrada.");
    }

    const ficheiro = r.ficheiro_processado || r.nome_ficheiro || "";
    let botaoFicheiro = "";

    if (ficheiro && ficheiro !== "formulario_site") {
      botaoFicheiro = `
<a class="btn btn-secondary mb-3" target="_blank" href="/imagens/${encodeURIComponent(ficheiro)}">
Ver ficheiro digitalizado
</a>`;
    }

    res.send(`
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

<div class="container mt-5" style="max-width:800px;">

<h1>Editar Inscrição</h1>

${botaoFicheiro}

<form method="POST" action="/atualizar/${r.id}">

${campoEditar("Nome completo", "nome_completo", r.nome_completo || r.socio_proposto || "")}
${campoEditar("Filiação", "filiacao", r.filiacao)}
${campoEditar("Proponente", "proponente", r.proponente)}
${campoEditar("Data de nascimento", "data_nascimento", r.data_nascimento, "date")}
${campoEditar("Profissão", "profissao", r.profissao)}
${campoEditar("Nacionalidade", "nacionalidade", r.nacionalidade)}
${campoEditar("Concelho", "concelho", r.concelho)}
${campoEditar("Distrito", "distrito", r.distrito)}
${campoEditar("Nome ficheiro", "nome_ficheiro", ficheiro)}

<div class="mb-3">
<label class="form-label">Estado</label>
<select class="form-select" name="estado">
<option ${r.estado === "Nova inscrição" ? "selected" : ""}>Nova inscrição</option>
<option ${r.estado === "Por rever" ? "selected" : ""}>Por rever</option>
<option ${r.estado === "Confirmado" ? "selected" : ""}>Confirmado</option>
<option ${r.estado === "Erro OCR" ? "selected" : ""}>Erro OCR</option>
<option ${r.estado === "Duplicado" ? "selected" : ""}>Duplicado</option>
</select>
</div>

<button class="btn btn-success" type="submit">Guardar alterações</button>
<a class="btn btn-secondary" href="/admin">Voltar</a>

</form>
</div>
`);
  });
});

app.post("/atualizar/:id", (req, res) => {
  db.run(`
    UPDATE inscricoes SET
      nome_completo = ?,
      filiacao = ?,
      proponente = ?,
      data_nascimento = ?,
      profissao = ?,
      nacionalidade = ?,
      concelho = ?,
      distrito = ?,
      nome_ficheiro = ?,
      estado = ?
    WHERE id = ?
  `, [
    req.body.nome_completo,
    req.body.filiacao,
    req.body.proponente,
    req.body.data_nascimento,
    req.body.profissao,
    req.body.nacionalidade,
    req.body.concelho,
    req.body.distrito,
    req.body.nome_ficheiro,
    req.body.estado,
    req.params.id
  ], err => {
    if (err) {
      return res.send("Erro ao atualizar: " + err.message);
    }

    res.send(`
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

<div class="container mt-5">
<div class="alert alert-success">
Inscrição atualizada com sucesso.
</div>

<a class="btn btn-dark" href="/admin">
Voltar à administração
</a>
</div>
`);
  });
});

function campoEditar(label, name, value = "", type = "text") {
  value = escapeHtml(String(value || ""));

  return `
<div class="mb-3">
<label class="form-label">${label}</label>
<input class="form-control" type="${type}" name="${name}" value="${value}">
</div>`;
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

app.listen(3000, () => {
  console.log("Servidor iniciado em http://localhost:3000");
});

