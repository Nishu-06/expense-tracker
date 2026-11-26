
package com.nishu.expensetracker.repository;

import com.nishu.expensetracker.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

}