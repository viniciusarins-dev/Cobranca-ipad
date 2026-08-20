-- Campos cadastrais adicionais do cliente (CPF/CNPJ, CEP, endereço).
-- Preenchidos manualmente ou pelo autopreenchimento gratuito de endereço a
-- partir do CEP (ViaCEP, API pública gratuita — não há busca reversa
-- telefone -> CPF/CNPJ/CEP gratuita e legal no Brasil, por isso essa parte
-- não foi implementada).
-- Tabela aditiva: não altera clients/contracts/installments/message_settings
-- existentes.

alter table clients add column if not exists document text;
alter table clients add column if not exists document_type text check (document_type in ('cpf', 'cnpj'));
alter table clients add column if not exists cep text;
alter table clients add column if not exists address text;
