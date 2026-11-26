package com.nishu.expensetracker.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ExpenseTest {

    @Test
    void storesExpenseDateThroughConstructorAndSetter() {
        LocalDate expenseDate = LocalDate.of(2026, 11, 26);
        Expense expense = new Expense("Groceries", new BigDecimal("25.50"), "Food", expenseDate);

        assertEquals(expenseDate, expense.getExpenseDate());

        LocalDate updatedDate = LocalDate.of(2026, 11, 25);
        expense.setExpenseDate(updatedDate);

        assertEquals(updatedDate, expense.getExpenseDate());
    }
}
