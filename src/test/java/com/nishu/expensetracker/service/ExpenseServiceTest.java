package com.nishu.expensetracker.service;

import com.nishu.expensetracker.model.Expense;
import com.nishu.expensetracker.repository.ExpenseRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ExpenseServiceTest {

    @Test
    void updateExpenseCopiesExpenseDateBeforeSaving() {
        ExpenseRepository repository = mock(ExpenseRepository.class);
        ExpenseService service = new ExpenseService(repository);
        Expense existing = new Expense("Groceries", new BigDecimal("25.50"), "Food", LocalDate.of(2026, 11, 24));
        Expense updated = new Expense("Groceries", new BigDecimal("27.00"), "Food", LocalDate.of(2026, 11, 26));

        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(existing)).thenReturn(existing);

        Expense saved = service.updateExpense(1L, updated);

        assertEquals(updated.getExpenseDate(), saved.getExpenseDate());
        verify(repository).save(existing);
    }
}
