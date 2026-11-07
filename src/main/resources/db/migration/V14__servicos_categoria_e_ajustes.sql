-- Categoria e descrição para organizar os serviços na tela de agendamento
ALTER TABLE tbl_servicos ADD COLUMN IF NOT EXISTS categoria VARCHAR(30) NOT NULL DEFAULT 'Cabelo';
ALTER TABLE tbl_servicos ADD COLUMN IF NOT EXISTS descricao VARCHAR(160);

UPDATE tbl_servicos SET categoria = 'Cabelo', descricao = 'Corte clássico na tesoura e máquina, com acabamento.' WHERE id_corte = 1;
UPDATE tbl_servicos SET categoria = 'Cabelo', descricao = 'Degradê moderno com transição suave e acabamento na navalha.' WHERE id_corte = 2;
UPDATE tbl_servicos SET categoria = 'Barba',  descricao = 'Modelagem, toalha quente e acabamento na navalha.' WHERE id_corte = 3;
UPDATE tbl_servicos SET categoria = 'Combo',  descricao = 'Degradê completo + barba. O pacote mais pedido da casa.' WHERE id_corte = 4;

-- Clientes que entram pelo Google não informam telefone.
-- Antes era gravado '00000000000', o que quebrava no 2º cliente (coluna UNIQUE).
ALTER TABLE tbl_clientes ALTER COLUMN telefone_cliente DROP NOT NULL;
UPDATE tbl_clientes SET telefone_cliente = NULL WHERE telefone_cliente = '00000000000';

-- Impede dois agendamentos ativos no mesmo horário (mesmo com cliques simultâneos)
CREATE UNIQUE INDEX IF NOT EXISTS ux_agendamento_horario_ativo
    ON tbl_agendamento (data_agendamento, hora_agendamento)
    WHERE status_agendamento <> 'Cancelado';
