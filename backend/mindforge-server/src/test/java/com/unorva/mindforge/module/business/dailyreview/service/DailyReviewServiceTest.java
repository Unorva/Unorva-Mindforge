package com.unorva.mindforge.module.business.dailyreview.service;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.dailyreview.dao.DailyReviewDao;
import com.unorva.mindforge.module.business.dailyreview.domain.entity.DailyReviewEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
class DailyReviewServiceTest {
    private static final LocalDate REVIEW_DATE=LocalDate.of(2026,10,8);
    private DailyReviewDao dao; private DailyReviewService service;
    @BeforeEach void setUp() { dao=mock(DailyReviewDao.class);service=new DailyReviewService(dao); }
    @Test void readingReviewIncludesExplicitUserAndDate() {
        assertEquals("", service.getDailyReviewContent(11L,REVIEW_DATE));verify(dao).selectByDate(11L,REVIEW_DATE);
    }
    @Test void savingUsesAtomicUpsertWithoutReadThenInsertRace() {
        when(dao.upsertContent(11L,REVIEW_DATE,"复盘")).thenReturn(2);
        service.updateDailyReview(11L,REVIEW_DATE,"复盘");verify(dao).upsertContent(11L,REVIEW_DATE,"复盘");
        verifyNoMoreInteractions(dao);
    }
    @Test void repeatedDeletionIsIdempotent() {
        service.deleteDailyReview(11L,REVIEW_DATE);service.deleteDailyReview(11L,REVIEW_DATE);verify(dao,times(2)).deleteContent(11L,REVIEW_DATE);
    }
    @Test void invalidContentAndDatesFailBeforeDatabaseAccess() {
        assertThrows(BusinessException.class, ()->service.updateDailyReview(11L,REVIEW_DATE,null));
        assertThrows(BusinessException.class, ()->service.updateDailyReview(11L,REVIEW_DATE,"x".repeat(1000001)));
        assertThrows(BusinessException.class, ()->service.getDailyReviewContent(11L,LocalDate.of(999,1,1)));
        assertThrows(BusinessException.class, ()->service.getDailyReviewCalendar(11L,YearMonth.of(10000,1)));verifyNoInteractions(dao);
    }
    @Test void monthlyReportUsesActualUserEntriesAndLeapYearRange() {
        DailyReviewEntity review=new DailyReviewEntity();review.setReviewDate(LocalDate.of(2024,2,29));review.setContent("闰年复盘");
        when(dao.selectEntries(11L,LocalDate.of(2024,2,1),LocalDate.of(2024,2,29))).thenReturn(List.of(review));
        var report=service.getDailyReviewReport(11L,"monthly",LocalDate.of(2024,2,8));
        assertEquals(LocalDate.of(2024,2,1),report.startDate());assertEquals(LocalDate.of(2024,2,29),report.endDate());
        assertEquals("闰年复盘",report.entries().getFirst().content());
        verify(dao).selectEntries(11L,LocalDate.of(2024,2,1),LocalDate.of(2024,2,29));
    }
    @Test void weeklyReportCrossesYearBoundaryFromMondayToSunday() {
        when(dao.selectEntries(11L,LocalDate.of(2025,12,29),LocalDate.of(2026,1,4))).thenReturn(List.of());
        var report=service.getDailyReviewReport(11L,"weekly",LocalDate.of(2026,1,1));
        assertEquals(LocalDate.of(2025,12,29),report.startDate());assertEquals(LocalDate.of(2026,1,4),report.endDate());assertTrue(report.entries().isEmpty());
    }
    @Test void weeklyReportHonorsSavedSundayStart() {
        when(dao.selectWeekStartsOn(11L)).thenReturn("星期日");
        when(dao.selectEntries(11L,LocalDate.of(2026,10,4),LocalDate.of(2026,10,10))).thenReturn(List.of());
        var report=service.getDailyReviewReport(11L,"weekly",REVIEW_DATE);assertEquals(LocalDate.of(2026,10,4),report.startDate());assertEquals(LocalDate.of(2026,10,10),report.endDate());
    }
}
