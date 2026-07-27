# Chrome Web Store — guia de submissão

Tudo que você precisa para publicar o SECAF-PRO na Chrome Web Store, com os textos prontos para copiar e colar no [Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Pré-requisitos

1. **Conta de desenvolvedor** — taxa única de US$ 5 em <https://chrome.google.com/webstore/devconsole>.
2. **Pelo menos 1 screenshot** — 1280×800 ou 640×400 px (PNG ou JPEG). Sugestão: a página do SECAF com o modal de resultados aberto (borre dados pessoais antes).

## Empacotamento (ZIP)

Inclua apenas os arquivos da extensão — nada de `.git`, `githooks/`, `docs/` etc.:

```sh
cd /Users/eleon/github/secaf-pro
zip -r secaf-pro.zip manifest.json background.js secaf_helper.js error.html images -x "*.DS_Store"
```

Envie esse ZIP em **Developer Dashboard → Items → New Item**.

## Aba "Store listing"

| Campo | Valor |
|-------|-------|
| Nome | SECAF-PRO |
| Idioma | Português (Brasil) |
| Categoria | Productivity → Workflow & Planning (ou Tools) |

**Descrição curta** (máx. 132 caracteres):

> Calcula horas presenciais no sistema SECAF do IBGE, conforme as regras do PGD 2.0.

**Descrição detalhada:**

> Extensão não oficial que calcula o saldo de horas presenciais no sistema SECAF do IBGE, com base nas regras do PGD 2.0.
>
> Como usar:
> 1. Acesse o sistema SECAF e abra a apuração do mês desejado.
> 2. Clique no ícone da extensão.
> 3. Informe as horas presenciais obrigatórias, dias de férias e feriados (a extensão sugere valores detectados automaticamente).
> 4. Um relatório é exibido com as horas devidas, as horas trabalhadas, o saldo do mês e o saldo diário necessário nos dias úteis restantes.
>
> Recursos:
> • Detecção automática de feriados e pontos facultativos a partir dos dias úteis do mês
> • Detecção automática dos dias de férias já registrados na apuração do mês (permite ajuste manual para férias futuras ainda não lançadas no SECAF)
> • Cruzamento automático entre a lista de feriados e os dias de férias, para não descontar duas vezes um feriado que cai durante as férias
> • Opção de incluir ou não o dia de hoje no cálculo
> • Todo o processamento é local — nenhum dado sai do seu navegador
>
> Esta extensão é um projeto independente, desenvolvido por servidor, e não é um produto oficial do IBGE.

## Aba "Privacy practices"

**Single purpose (finalidade única):**

> Calcular o saldo de horas presenciais do usuário a partir dos dados exibidos na página do sistema SECAF que ele está visualizando, quando ele clica no ícone da extensão.

**Justificativas de permissão:**

| Permissão | Justificativa |
|-----------|---------------|
| `activeTab` | A extensão só é executada na aba ativa e apenas quando o usuário clica no ícone. Não roda em segundo plano nem em outras abas. |
| `scripting` | Necessária para injetar o script de cálculo na página do SECAF após o clique do usuário. |

(Não há host permissions: o acesso é concedido apenas à aba ativa, no momento do clique.)

**Uso de dados:** marque que a extensão **não coleta nem usa dados de usuário**. Não há certificação de venda/transferência a declarar além disso.

**Privacy policy URL:**

> https://github.com/leoniedu/secaf-pro/blob/main/PRIVACY.md

## Aba "Distribution"

- **Visibilidade:** como o público é restrito a servidores do IBGE, considere **Unlisted** — a extensão só é encontrada por quem tem o link, mas a instalação é normal. Use **Public** apenas se quiser que apareça em buscas.
- **Regiões:** apenas Brasil é suficiente.

## Recomendações antes de enviar

1. **Bump de versão:** o hook de pre-push já cuida disso; confira apenas que a versão no ZIP enviado corresponde à do repositório.
2. **Revisão:** a primeira análise costuma levar de 1 a 3 dias úteis. Rejeições mais comuns: ícone placeholder, descrição vaga da finalidade única e permissões não justificadas — os textos acima cobrem esses pontos.
