package com.unorva.mindforge.module.business.mail.client;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;

import org.junit.jupiter.api.Test;

import java.util.Properties;

/**
 * MIME import preserves readable text while excluding attachments and bounding downloaded bodies.
 */
class MailContentTest {
    private final Session session = Session.getInstance(new Properties());

    @Test
    void plainUtf8BodyPreservesUnicodeAndLineBreaks() throws Exception {
        MimeMessage message = new MimeMessage(session);
        message.setText("你好，邮箱\nSecond line", "UTF-8");
        message.saveChanges();

        assertEquals("你好，邮箱\nSecond line", extract(message));
    }

    @Test
    void alternativePrefersPlainTextEvenWhenHtmlAppearsFirst() throws Exception {
        MimeBodyPart html = new MimeBodyPart();
        html.setText("<p>HTML fallback</p>", "UTF-8", "html");
        MimeBodyPart plain = new MimeBodyPart();
        plain.setText("Preferred plain text", "UTF-8");
        MimeMultipart alternatives = new MimeMultipart("alternative");
        alternatives.addBodyPart(html);
        alternatives.addBodyPart(plain);

        assertEquals("Preferred plain text", extract(message(alternatives)));
    }

    @Test
    void htmlOnlyMessageConvertsMarkupAndEntitiesToReadableText() throws Exception {
        MimeMessage message = new MimeMessage(session);
        message.setText("<p>Hello <b>reader</b></p><p>Next &amp; last</p>", "UTF-8", "html");
        message.saveChanges();

        String text = extract(message);
        assertTrue(text.contains("Hello reader"));
        assertTrue(text.contains("Next & last"));
        assertFalse(text.contains("<p>"));
        assertTrue(text.contains("\n"));
    }

    @Test
    void attachmentsAndFilenamePartsNeverHaveTheirContentsDownloaded() throws Exception {
        Part attachment = mock(Part.class);
        when(attachment.getDisposition()).thenReturn(Part.ATTACHMENT);
        assertEquals("", extract(attachment));
        verify(attachment, never()).getInputStream();
        verify(attachment, never()).getContent();

        Part namedInline = mock(Part.class);
        when(namedInline.getFileName()).thenReturn("report.txt");
        assertEquals("", extract(namedInline));
        verify(namedInline, never()).getInputStream();
        verify(namedInline, never()).getContent();
    }

    @Test
    void textAttachmentCannotDisplaceTheReadableBody() throws Exception {
        MimeBodyPart attachment = new MimeBodyPart();
        attachment.setText("Private attachment contents", "UTF-8");
        attachment.setDisposition(Part.ATTACHMENT);
        attachment.setFileName("report.txt");
        MimeBodyPart html = new MimeBodyPart();
        html.setText("<p>Actual message body</p>", "UTF-8", "html");
        MimeMultipart mixed = new MimeMultipart("mixed");
        mixed.addBodyPart(attachment);
        mixed.addBodyPart(html);

        String body = extract(message(mixed));
        assertEquals("Actual message body", body);
        assertFalse(body.contains("Private attachment contents"));
    }

    @Test
    void importedBodyStopsAtTheMaximumLength() throws Exception {
        MimeMessage message = new MimeMessage(session);
        message.setText("x".repeat(MailGateway.MAX_BODY_LENGTH + 4096), "UTF-8");
        message.saveChanges();

        assertEquals("x".repeat(MailGateway.MAX_BODY_LENGTH), extract(message));
        assertEquals("", MailGateway.bounded(null, 20));
        assertEquals("short", MailGateway.bounded("short", 20));
        assertEquals("abc", MailGateway.bounded("abcdef", 3));
    }

    @Test
    void htmlScriptAndStyleContentsAreExcluded() throws Exception {
        String html =
                "<html><head><style>.hidden { color: red; }</style></head><body><p>Visible"
                    + " text</p><script>window.secret = 'hidden-script-token';</script><p>Another"
                    + " visible line</p></body></html>";

        String text = MailGateway.htmlToText(html);
        assertTrue(text.contains("Visible text"));
        assertTrue(text.contains("Another visible line"));
        assertFalse(text.contains("hidden-script-token"));
        assertFalse(text.contains("window.secret"));
        assertFalse(text.contains("color: red"));
        assertFalse(text.contains(".hidden"));
    }

    private MimeMessage message(MimeMultipart multipart) throws Exception {
        MimeMessage message = new MimeMessage(session);
        message.setContent(multipart);
        message.saveChanges();
        return message;
    }

    private static String extract(Part part) throws Exception {
        return MailGateway.extractText(part, 0, new int[] {64});
    }
}
