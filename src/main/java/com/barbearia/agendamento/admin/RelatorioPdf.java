package com.barbearia.agendamento.admin;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

import com.barbearia.agendamento.agendamento.AgendaPolicy;
import com.barbearia.agendamento.agendamento.AgendamentoDtos.AgendamentoResponse;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

/** Gera o PDF do relatório de agendamentos. */
final class RelatorioPdf {

    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");
    private static final Color ESCURO = new Color(24, 20, 20);
    private static final Color ZEBRA = new Color(246, 243, 243);

    private RelatorioPdf() {
    }

    static byte[] gerar(List<AgendamentoResponse> itens, String filtros) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
        PdfWriter.getInstance(doc, out);
        doc.open();

        Paragraph titulo = new Paragraph("Relatório de Agendamentos - Pitbull Barber",
                new Font(Font.HELVETICA, 18, Font.BOLD, ESCURO));
        titulo.setAlignment(Element.ALIGN_CENTER);
        titulo.setSpacingAfter(8);
        doc.add(titulo);

        Font info = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(100, 100, 100));
        doc.add(new Paragraph("Gerado em " + AgendaPolicy.hoje().format(DATA)
                + (filtros.isBlank() ? "" : "  |  Filtros: " + filtros), info));

        PdfPTable tabela = new PdfPTable(new float[] { 0.6f, 3f, 2.4f, 1.4f, 1f, 1.4f, 1.2f });
        tabela.setWidthPercentage(100);
        tabela.setSpacingBefore(14);

        Font cab = new Font(Font.HELVETICA, 11, Font.BOLD, Color.WHITE);
        for (String h : new String[] { "#", "Cliente", "Serviço", "Data", "Hora", "Status", "Valor" }) {
            PdfPCell c = new PdfPCell(new Phrase(h, cab));
            c.setBackgroundColor(ESCURO);
            c.setPadding(7);
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            tabela.addCell(c);
        }

        Font corpo = new Font(Font.HELVETICA, 10);
        int n = 1;
        for (AgendamentoResponse a : itens) {
            Color fundo = n % 2 == 0 ? ZEBRA : Color.WHITE;
            celula(tabela, String.valueOf(n), corpo, fundo, Element.ALIGN_CENTER);
            celula(tabela, a.cliente(), corpo, fundo, Element.ALIGN_LEFT);
            celula(tabela, a.servico(), corpo, fundo, Element.ALIGN_LEFT);
            celula(tabela, a.data().format(DATA), corpo, fundo, Element.ALIGN_CENTER);
            celula(tabela, a.hora().format(HORA), corpo, fundo, Element.ALIGN_CENTER);
            celula(tabela, rotulo(a.status()), corpo, fundo, Element.ALIGN_CENTER);
            celula(tabela, "R$ " + a.valor().setScale(2).toPlainString().replace('.', ','), corpo, fundo,
                    Element.ALIGN_RIGHT);
            n++;
        }
        doc.add(tabela);

        Paragraph total = new Paragraph("Total de agendamentos: " + itens.size(),
                new Font(Font.HELVETICA, 12, Font.BOLD));
        total.setAlignment(Element.ALIGN_RIGHT);
        total.setSpacingBefore(14);
        doc.add(total);

        doc.close();
        return out.toByteArray();
    }

    private static void celula(PdfPTable t, String texto, Font f, Color fundo, int alinhamento) {
        PdfPCell c = new PdfPCell(new Phrase(texto == null ? "-" : texto, f));
        c.setBackgroundColor(fundo);
        c.setPadding(6);
        c.setHorizontalAlignment(alinhamento);
        t.addCell(c);
    }

    private static String rotulo(String status) {
        return switch (status) {
            case "CONCLUIDO" -> "Concluído";
            case "CANCELADO" -> "Cancelado";
            default -> "Agendado";
        };
    }
}
