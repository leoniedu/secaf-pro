# SECAF-PRO - Extensão para Chrome

Esta extensão para Chrome permite calcular horas presenciais no sistema SECAF do IBGE, com base nas regras do PGD 2.0.

## Instalação

Para instalar a extensão, siga estes passos:

1. Abra o Chrome e navegue para `chrome://extensions/`
2. Ative o "Modo do desenvolvedor" no canto superior direito
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `secaf-pro` que contém os arquivos da extensão
5. A extensão será instalada e aparecerá na barra de ferramentas do Chrome

## Uso

1. Acesse o sistema SECAF do IBGE e abra a apuração do mês desejado
2. Clique no ícone da extensão na barra de ferramentas
3. Informe as horas presenciais obrigatórias por mês (a extensão sugere o valor detectado nos dias de férias e feriados, ajuste apenas se houver férias futuras ainda não registradas no SECAF)
4. Confirme se deseja incluir a data de hoje no cálculo
5. Um relatório é exibido com as horas devidas, as horas trabalhadas, o saldo do mês e o saldo diário necessário nos dias úteis restantes

## Recursos

- Cálculo automático de horas presenciais baseado nas regras do PGD 2.0 do IBGE
- Detecção automática de feriados e pontos facultativos a partir dos dias úteis do mês
- Detecção automática dos dias de férias já registrados na apuração do mês (com ajuste manual para férias futuras ainda não lançadas no SECAF)
- Cruzamento automático entre a lista de feriados e os dias de férias, para não descontar duas vezes um feriado que cai durante as férias
- Opção de incluir ou não o dia de hoje no cálculo
- Exibição de resultados em formato de horas e minutos (ex: 8h30min) para melhor legibilidade
- Todo o processamento é local — nenhum dado sai do seu navegador
- Compatível com o sistema SECAF do IBGE

## Detalhes Técnicos

Esta extensão foi desenvolvida usando JavaScript puro e APIs do Chrome. Ela funciona extraindo dados da página do SECAF e realizando cálculos com base nas regras do PGD 2.0.

### Arquivos Principais

- `manifest.json`: Configuração da extensão
- `background.js`: Script de fundo que gerencia a execução da extensão
- `secaf_helper.js`: Script principal que contém a lógica de cálculo
- `error.html`: Página de erro exibida quando a extensão é usada fora do sistema SECAF

## Desenvolvimento

Para contribuir com o desenvolvimento desta extensão:

1. Clone este repositório
2. Faça suas alterações
3. Teste a extensão localmente seguindo as instruções de instalação
4. Envie um pull request com suas melhorias

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.

## Observações

Esta é uma extensão não oficial e funciona apenas no sistema SECAF do IBGE.
